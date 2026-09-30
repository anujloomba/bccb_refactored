import Foundation
import UserNotifications
#if canImport(AlarmKit)
import AlarmKit
import AppIntents
import SwiftUI
#endif

struct GameAlarmRequest {
    let id: String
    let gameDayId: String
    let groupId: Int
    let alarmAt: Date
    let leaveAt: Date?
    let title: String
    let body: String
    let leaveTitle: String
    let leaveBody: String
}

struct GameAlarmError: Error {
    let code: String
    let message: String
}

/// Game-day wake-up alarms. iOS 26+ uses AlarmKit (a real system alarm that rings through Silent
/// and Focus); earlier versions use a notification with a bundled alarm tone and follow-up nudges.
enum GameAlarmScheduler {
    private static let storeKey = "bccb.alarms"
    private static let followUpMinutes = [3, 6]
    private static let keepAfterFire: TimeInterval = 6 * 60 * 60
    private static let soundName = UNNotificationSoundName("game-alarm.wav")

    static var mode: String {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            return "alarmkit"
        }
        #endif
        return "notification"
    }

    // MARK: - Permissions

    private static func notificationPermission() async -> String {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return "granted"
        case .denied:
            return "denied"
        default:
            return "prompt"
        }
    }

    static func permission() async -> [String: Any] {
        let notifications = await notificationPermission()
        var permission = notifications
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            switch AlarmManager.shared.authorizationState {
            case .authorized:
                permission = "granted"
            case .denied:
                permission = "denied"
            default:
                permission = "prompt"
            }
        }
        #endif
        return ["permission": permission, "mode": mode, "notifications": notifications]
    }

    static func requestPermission() async -> [String: Any] {
        if await notificationPermission() == "prompt" {
            _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        }
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *), AlarmManager.shared.authorizationState == .notDetermined {
            _ = try? await AlarmManager.shared.requestAuthorization()
        }
        #endif
        return await permission()
    }

    /// Asks for AlarmKit access when needed. True when the alarm can ring through AlarmKit.
    private static func alarmKitReady() async -> Bool {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            let manager = AlarmManager.shared
            if manager.authorizationState == .notDetermined {
                _ = try? await manager.requestAuthorization()
            }
            return manager.authorizationState == .authorized
        }
        #endif
        return false
    }

    private static func requireNotificationPermission() async throws {
        if await notificationPermission() == "prompt" {
            _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        }
        guard await notificationPermission() == "granted" else {
            throw GameAlarmError(code: "notifications_denied", message: "Turn on notifications for BCCB Cricket so your alarm can ring.")
        }
    }

    // MARK: - Scheduling

    static func schedule(_ request: GameAlarmRequest) async throws -> [String: Any] {
        guard request.alarmAt > Date() else {
            throw GameAlarmError(code: "invalid_time", message: "Choose an alarm time in the future.")
        }
        // Check permissions before touching the existing alarm, so a failed change leaves it in place.
        let canUseAlarmKit = await alarmKitReady()
        if !canUseAlarmKit {
            try await requireNotificationPermission()
        }
        cancel(id: request.id)

        var record: [String: Any] = [
            "id": request.id,
            "gameDayId": request.gameDayId,
            "groupId": request.groupId,
            "alarmAt": request.alarmAt.timeIntervalSince1970 * 1000,
            "leaveAt": (request.leaveAt?.timeIntervalSince1970 ?? 0) * 1000,
            "mode": "notification"
        ]
        var usedAlarmKit = false
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            do {
                let alarmId = try await scheduleWithAlarmKit(request)
                record["mode"] = "alarmkit"
                record["alarmKitId"] = alarmId.uuidString
                usedAlarmKit = true
            } catch let error as GameAlarmError where error.code == "alarm_denied" {
                // Alarms were declined: fall back to a notification alarm below.
            }
        }
        #endif
        if !usedAlarmKit {
            try await scheduleNotificationAlarm(request)
        }
        try? await scheduleLeaveNudge(request)
        save(record, id: request.id)

        var result: [String: Any] = ["scheduled": true, "mode": record["mode"] ?? "notification", "alarmAt": record["alarmAt"] ?? 0]
        if !usedAlarmKit, await notificationPermission() != "granted" {
            result["warning"] = "notifications_disabled"
        }
        return result
    }

    #if canImport(AlarmKit)
    @available(iOS 26.0, *)
    private static func scheduleWithAlarmKit(_ request: GameAlarmRequest) async throws -> UUID {
        let manager = AlarmManager.shared
        if manager.authorizationState == .notDetermined {
            _ = try? await manager.requestAuthorization()
        }
        guard manager.authorizationState == .authorized else {
            throw GameAlarmError(code: "alarm_denied", message: "Alarms are off for BCCB Cricket. Turn them on in Settings.")
        }
        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: request.title),
            stopButton: AlarmButton(text: "Stop", textColor: .white, systemImageName: "stop.circle"),
            secondaryButton: AlarmButton(text: "Start trip", textColor: .white, systemImageName: "car.fill"),
            secondaryButtonBehavior: .custom
        )
        let attributes = AlarmAttributes<GameAlarmMetadata>(
            presentation: AlarmPresentation(alert: alert),
            metadata: GameAlarmMetadata(gameDayId: request.gameDayId),
            tintColor: Color(red: 0.46, green: 0.29, blue: 0.64)
        )
        let configuration = AlarmManager.AlarmConfiguration<GameAlarmMetadata>.alarm(
            schedule: .fixed(request.alarmAt),
            attributes: attributes,
            secondaryIntent: StartTripIntent(gameDayId: request.gameDayId)
        )
        let alarmId = UUID()
        _ = try await manager.schedule(id: alarmId, configuration: configuration)
        return alarmId
    }
    #endif

    private static func trigger(for date: Date) -> UNCalendarNotificationTrigger {
        UNCalendarNotificationTrigger(
            dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date),
            repeats: false
        )
    }

    private static func alarmIdentifiers(_ gameDayId: String) -> [String] {
        ["alarm-\(gameDayId)"] + followUpMinutes.indices.map { "alarm-\(gameDayId)-\($0 + 2)" }
    }

    private static func scheduleNotificationAlarm(_ request: GameAlarmRequest) async throws {
        let center = UNUserNotificationCenter.current()
        try await requireNotificationPermission()
        let identifiers = alarmIdentifiers(request.gameDayId)
        let offsets = [0] + followUpMinutes
        for (index, offset) in offsets.enumerated() {
            let content = UNMutableNotificationContent()
            content.title = index == 0 ? request.title : "⏰ Still sleeping?"
            content.body = request.body
            content.sound = UNNotificationSound(named: soundName)
            content.categoryIdentifier = NotificationCategories.gameAlarm
            content.threadIdentifier = "alarm-\(request.gameDayId)"
            content.userInfo = [
                "type": "alarm",
                "gameDayId": request.gameDayId,
                "groupId": request.groupId,
                "route": "bccb://game-day/\(request.gameDayId)"
            ]
            let date = request.alarmAt.addingTimeInterval(TimeInterval(offset * 60))
            try await center.add(UNNotificationRequest(identifier: identifiers[index], content: content, trigger: trigger(for: date)))
        }
    }

    private static func scheduleLeaveNudge(_ request: GameAlarmRequest) async throws {
        guard let leaveAt = request.leaveAt, leaveAt > Date() else {
            return
        }
        let content = UNMutableNotificationContent()
        content.title = request.leaveTitle
        content.body = request.leaveBody
        content.sound = .default
        content.categoryIdentifier = NotificationCategories.leaveNow
        content.userInfo = [
            "type": "leave_now",
            "gameDayId": request.gameDayId,
            "groupId": request.groupId,
            "route": "bccb://game-day/\(request.gameDayId)/trip"
        ]
        try await UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: "leave-\(request.gameDayId)", content: content, trigger: trigger(for: leaveAt))
        )
    }

    // MARK: - Cancelling

    /// Stops pending follow-up rings once the player has seen the alarm.
    static func silenceFollowUps(gameDayId: String) {
        let followUps = Array(alarmIdentifiers(gameDayId).dropFirst())
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: followUps)
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: followUps)
    }

    /// Called when the app comes to the foreground: anyone opening the app after their alarm is awake.
    static func clearRangAlarms() {
        let now = Date().timeIntervalSince1970 * 1000
        for record in load().values where (record["alarmAt"] as? Double ?? 0) < now {
            if let gameDayId = record["gameDayId"] as? String {
                silenceFollowUps(gameDayId: gameDayId)
            }
        }
    }

    @discardableResult
    static func cancel(id: String) -> Bool {
        var store = load()
        guard let record = store[id] else {
            return false
        }
        removeScheduled(record)
        store.removeValue(forKey: id)
        UserDefaults.standard.set(store, forKey: storeKey)
        return true
    }

    static func cancel(gameDayId: String) {
        for (id, record) in load() where record["gameDayId"] as? String == gameDayId {
            cancel(id: id)
        }
        removeScheduled(["gameDayId": gameDayId])
    }

    static func cancelAll() {
        for id in load().keys {
            cancel(id: id)
        }
        UserDefaults.standard.removeObject(forKey: storeKey)
    }

    private static func removeScheduled(_ record: [String: Any]) {
        let gameDayId = record["gameDayId"] as? String ?? ""
        let identifiers = alarmIdentifiers(gameDayId) + ["leave-\(gameDayId)"]
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: identifiers)
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: identifiers)
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *), let value = record["alarmKitId"] as? String, let alarmId = UUID(uuidString: value) {
            try? AlarmManager.shared.cancel(id: alarmId)
        }
        #endif
    }

    // MARK: - Store

    static func list() -> [[String: Any]] {
        let cutoff = (Date().timeIntervalSince1970 - keepAfterFire) * 1000
        return load().values
            .filter { ($0["alarmAt"] as? Double ?? 0) > cutoff }
            .map { record -> [String: Any] in
                [
                    "id": record["id"] ?? "",
                    "gameDayId": record["gameDayId"] ?? "",
                    "alarmAt": record["alarmAt"] ?? 0,
                    "leaveAt": record["leaveAt"] ?? 0,
                    "mode": record["mode"] ?? "notification"
                ]
            }
    }

    private static func load() -> [String: [String: Any]] {
        (UserDefaults.standard.dictionary(forKey: storeKey) as? [String: [String: Any]]) ?? [:]
    }

    private static func save(_ record: [String: Any], id: String) {
        var store = load()
        store[id] = record
        UserDefaults.standard.set(store, forKey: storeKey)
    }
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct GameAlarmMetadata: AlarmMetadata {
    let gameDayId: String
}

/// The alarm's "Start trip" button: opens the app on the live trip for that game.
@available(iOS 26.0, *)
struct StartTripIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Start trip"
    static let openAppWhenRun = true

    @Parameter(title: "Game day")
    var gameDayId: String

    init() {
        self.gameDayId = ""
    }

    init(gameDayId: String) {
        self.gameDayId = gameDayId
    }

    func perform() async throws -> some IntentResult {
        NativeInbox.shared.queueAction([
            "action": "start_trip",
            "type": "alarm",
            "gameDayId": gameDayId,
            "route": "bccb://game-day/\(gameDayId)/trip"
        ])
        return .result()
    }
}
#endif
