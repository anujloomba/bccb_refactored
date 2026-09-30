import Capacitor
import CoreLocation
import Foundation
import UIKit
import UserNotifications

/// Hosts the web app and registers the app's own native plugin with the Capacitor bridge.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(BCCBNativePlugin())
    }
}

/// Game Day session shared by the web app, alarms, and live trip uploads.
enum SessionStore {
    private static let defaults = UserDefaults.standard

    struct Session {
        let apiBase: String
        let groupId: Int
        let groupName: String
        let deviceId: String
        let deviceToken: String
        let playerId: String?
    }

    static func load() -> Session? {
        guard
            let apiBase = defaults.string(forKey: "bccb.apiBase"),
            let token = defaults.string(forKey: "bccb.deviceToken"),
            defaults.integer(forKey: "bccb.groupId") > 0
        else {
            return nil
        }
        return Session(
            apiBase: apiBase,
            groupId: defaults.integer(forKey: "bccb.groupId"),
            groupName: defaults.string(forKey: "bccb.groupName") ?? "",
            deviceId: defaults.string(forKey: "bccb.deviceId") ?? "",
            deviceToken: token,
            playerId: defaults.string(forKey: "bccb.playerId")
        )
    }

    static func save(apiBase: String, groupId: Int, groupName: String, deviceId: String, deviceToken: String, playerId: String?) {
        var base = apiBase
        while base.hasSuffix("/") {
            base.removeLast()
        }
        defaults.set(base, forKey: "bccb.apiBase")
        defaults.set(groupId, forKey: "bccb.groupId")
        defaults.set(groupName, forKey: "bccb.groupName")
        defaults.set(deviceId, forKey: "bccb.deviceId")
        defaults.set(deviceToken, forKey: "bccb.deviceToken")
        defaults.set(playerId, forKey: "bccb.playerId")
    }

    static func clear() {
        ["bccb.apiBase", "bccb.groupId", "bccb.groupName", "bccb.deviceId", "bccb.deviceToken", "bccb.playerId"]
            .forEach { defaults.removeObject(forKey: $0) }
    }

    /// Sends a JSON request to /groups/{groupId}{path} with the device's bearer token.
    static func request(
        _ session: Session,
        method: String,
        path: String,
        body: [String: Any]? = nil,
        completion: @escaping (_ status: Int, _ json: [String: Any], _ networkError: Bool) -> Void
    ) {
        guard let url = URL(string: "\(session.apiBase)/groups/\(session.groupId)\(path)") else {
            completion(0, [:], true)
            return
        }
        var request = URLRequest(url: url, timeoutInterval: 15)
        request.httpMethod = method
        request.setValue("Bearer \(session.deviceToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body = body, let data = try? JSONSerialization.data(withJSONObject: body) {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = data
        }
        URLSession.shared.dataTask(with: request) { data, response, error in
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]
            completion(status, json, error != nil)
        }.resume()
    }
}

/// Notification categories for Game Day. Identifiers match native-bridge.js and the Android actions.
enum NotificationCategories {
    static let gameInvite = "GAME_INVITE"
    static let leaveNow = "LEAVE_NOW"
    static let gameAlarm = "GAME_ALARM"
    static let rsvpYes = "RSVP_YES"
    static let rsvpMaybe = "RSVP_MAYBE"
    static let rsvpNo = "RSVP_NO"
    static let startTrip = "START_TRIP"

    static func register() {
        let yes = UNNotificationAction(identifier: rsvpYes, title: "✅ In", options: [.foreground])
        let maybe = UNNotificationAction(identifier: rsvpMaybe, title: "🤔 Maybe", options: [.foreground])
        let no = UNNotificationAction(identifier: rsvpNo, title: "❌ Out", options: [.foreground])
        let trip = UNNotificationAction(identifier: startTrip, title: "🚗 Start trip", options: [.foreground])
        UNUserNotificationCenter.current().setNotificationCategories([
            UNNotificationCategory(identifier: gameInvite, actions: [yes, maybe, no], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: leaveNow, actions: [trip], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: gameAlarm, actions: [trip], intentIdentifiers: [], options: [.customDismissAction])
        ])
    }
}

/// Hand-offs that can arrive before the plugin (or the web app) is ready: links, shared PDFs, and alarm actions.
final class NativeInbox {
    static let shared = NativeInbox()
    private static let pendingActionKey = "bccb.pendingAction"

    weak var plugin: BCCBNativePlugin?
    private var launchRoute: String?
    private var sharedFile: (name: String, url: URL)?

    func handle(url: URL, coldStart: Bool) {
        if url.scheme?.lowercased() == "bccb" {
            if coldStart || plugin == nil {
                launchRoute = url.absoluteString
            } else {
                plugin?.emit("deepLink", ["route": url.absoluteString])
            }
            return
        }
        guard url.isFileURL else {
            return
        }
        let accessing = url.startAccessingSecurityScopedResource()
        defer {
            if accessing {
                url.stopAccessingSecurityScopedResource()
            }
        }
        let destination = FileManager.default.temporaryDirectory
            .appendingPathComponent("shared-scorecard-\(UUID().uuidString).pdf")
        do {
            try FileManager.default.copyItem(at: url, to: destination)
            if url.path.contains("/Inbox/") {
                try? FileManager.default.removeItem(at: url)
            }
            if let previous = sharedFile {
                try? FileManager.default.removeItem(at: previous.url)
            }
            sharedFile = (name: url.lastPathComponent, url: destination)
            plugin?.emit("sharedFile", [:])
        } catch {
            CAPLog.print("Could not open the shared PDF: \(error.localizedDescription)")
        }
    }

    func takeLaunchRoute() -> String? {
        defer { launchRoute = nil }
        return launchRoute
    }

    func takeSharedFile() -> (name: String, url: URL)? {
        defer { sharedFile = nil }
        return sharedFile
    }

    /// Queues a notification-style action (for example "Start trip" pressed on an alarm) for the web app.
    func queueAction(_ action: [String: Any]) {
        UserDefaults.standard.set(action, forKey: NativeInbox.pendingActionKey)
        DispatchQueue.main.async {
            self.deliverPendingAction()
        }
    }

    func deliverPending() {
        if sharedFile != nil {
            plugin?.emit("sharedFile", [:])
        }
        deliverPendingAction()
    }

    func deliverPendingAction() {
        guard let plugin = plugin,
              let action = UserDefaults.standard.dictionary(forKey: NativeInbox.pendingActionKey) else {
            return
        }
        UserDefaults.standard.removeObject(forKey: NativeInbox.pendingActionKey)
        plugin.emit("notificationAction", action)
    }
}

/// The iOS side of the native bridge contract (tools/native-bridge-contract.json).
@objc(BCCBNativePlugin)
public class BCCBNativePlugin: CAPPlugin, CAPBridgedPlugin, NotificationHandlerProtocol {
    public let identifier = "BCCBNativePlugin"
    public let jsName = "BCCBNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLocationPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestLocationPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentPosition", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAlarmPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAlarmPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleGameAlarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelGameAlarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getScheduledAlarms", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startTrip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopTrip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTripStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeSharedFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeLaunchRoute", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openExternalUrl", returnType: CAPPluginReturnPromise)
    ]

    private var location: LocationService?
    private var observers: [NSObjectProtocol] = []

    override public func load() {
        NotificationCategories.register()
        bridge?.notificationRouter.localNotificationHandler = self
        NativeInbox.shared.plugin = self
        DispatchQueue.main.async {
            self.location = LocationService()
            TripTracker.shared.onStatus = { [weak self] status in
                self?.notifyListeners("tripStatus", data: status)
            }
            TripTracker.shared.resumeIfNeeded()
            NativeInbox.shared.deliverPending()
        }
        observers.append(NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            GameAlarmScheduler.clearRangAlarms()
            self?.notifyListeners("resume", data: [:])
            NativeInbox.shared.deliverPendingAction()
        })
    }

    deinit {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
    }

    func emit(_ event: String, _ data: [String: Any]) {
        notifyListeners(event, data: data, retainUntilConsumed: true)
    }

    // MARK: - Local notifications (alarms without AlarmKit, time-to-leave, arrival)

    public func willPresent(notification: UNNotification) -> UNNotificationPresentationOptions {
        return [.banner, .list, .sound]
    }

    public func didReceive(response: UNNotificationResponse) {
        guard response.actionIdentifier != UNNotificationDismissActionIdentifier else {
            return
        }
        let info = response.notification.request.content.userInfo
        let gameDayId = info["gameDayId"] as? String ?? ""
        if response.notification.request.content.categoryIdentifier == NotificationCategories.gameAlarm {
            GameAlarmScheduler.silenceFollowUps(gameDayId: gameDayId)
        }
        emit("notificationAction", [
            "action": response.actionIdentifier == NotificationCategories.startTrip ? "start_trip" : "open",
            "type": info["type"] as? String ?? "",
            "groupId": info["groupId"] as? Int ?? 0,
            "gameDayId": gameDayId,
            "route": info["route"] as? String ?? ""
        ])
    }

    // MARK: - Contract methods

    @objc func getCapabilities(_ call: CAPPluginCall) {
        call.resolve([
            "platform": "ios",
            "appVersion": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
            "push": Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil,
            "alarms": GameAlarmScheduler.mode,
            "backgroundLocation": true,
            "sharedFiles": true
        ])
    }

    @objc func setSession(_ call: CAPPluginCall) {
        guard
            let apiBase = call.getString("apiBase"),
            apiBase.hasPrefix("https://") || apiBase.hasPrefix("http://"),
            let token = call.getString("deviceToken"),
            let groupId = call.getInt("groupId"),
            groupId > 0
        else {
            call.reject("A valid Game Day session is required.", "invalid_session")
            return
        }
        SessionStore.save(
            apiBase: apiBase,
            groupId: groupId,
            groupName: call.getString("groupName") ?? "",
            deviceId: call.getString("deviceId") ?? "",
            deviceToken: token,
            playerId: call.getString("playerId")
        )
        call.resolve()
    }

    @objc func clearSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            TripTracker.shared.stop(deleteRemote: false)
            GameAlarmScheduler.cancelAll()
            SessionStore.clear()
            call.resolve()
        }
    }

    @objc func getLocationPermission(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["permission": self.locationService().permissionState()])
        }
    }

    @objc func requestLocationPermission(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.locationService().requestPermission { state in
                call.resolve(["permission": state])
            }
        }
    }

    @objc func getCurrentPosition(_ call: CAPPluginCall) {
        let timeout = max(5, min((call.getDouble("timeoutMs") ?? 15000) / 1000, 30))
        DispatchQueue.main.async {
            self.locationService().currentPosition(timeout: timeout) { result in
                switch result {
                case .success(let location):
                    call.resolve([
                        "lat": location.coordinate.latitude,
                        "lng": location.coordinate.longitude,
                        "accuracy": location.horizontalAccuracy,
                        "timestamp": location.timestamp.timeIntervalSince1970 * 1000
                    ])
                case .failure(let error):
                    call.reject(error.message, error.code)
                }
            }
        }
    }

    @objc func getAlarmPermission(_ call: CAPPluginCall) {
        Task {
            call.resolve(await GameAlarmScheduler.permission())
        }
    }

    @objc func requestAlarmPermission(_ call: CAPPluginCall) {
        Task {
            call.resolve(await GameAlarmScheduler.requestPermission())
        }
    }

    @objc func scheduleGameAlarm(_ call: CAPPluginCall) {
        guard
            let id = call.getString("id"),
            let gameDayId = call.getString("gameDayId"),
            let alarmAt = call.getDouble("alarmAt")
        else {
            call.reject("The alarm details are incomplete.", "invalid_arguments")
            return
        }
        let request = GameAlarmRequest(
            id: id,
            gameDayId: gameDayId,
            groupId: call.getInt("groupId") ?? 0,
            alarmAt: Date(timeIntervalSince1970: alarmAt / 1000),
            leaveAt: call.getDouble("leaveAt").map { Date(timeIntervalSince1970: $0 / 1000) },
            title: call.getString("title") ?? "Game day",
            body: call.getString("body") ?? "",
            leaveTitle: call.getString("leaveTitle") ?? "Time to leave",
            leaveBody: call.getString("leaveBody") ?? ""
        )
        Task {
            do {
                call.resolve(try await GameAlarmScheduler.schedule(request))
            } catch let error as GameAlarmError {
                call.reject(error.message, error.code)
            } catch {
                call.reject(error.localizedDescription, "alarm_failed")
            }
        }
    }

    @objc func cancelGameAlarm(_ call: CAPPluginCall) {
        call.resolve(["cancelled": GameAlarmScheduler.cancel(id: call.getString("id") ?? "")])
    }

    @objc func getScheduledAlarms(_ call: CAPPluginCall) {
        call.resolve(["alarms": GameAlarmScheduler.list()])
    }

    @objc func startTrip(_ call: CAPPluginCall) {
        guard
            let gameDayId = call.getString("gameDayId"),
            let venueLat = call.getDouble("venueLat"),
            let venueLng = call.getDouble("venueLng")
        else {
            call.reject("The trip details are incomplete.", "invalid_arguments")
            return
        }
        DispatchQueue.main.async {
            guard self.locationService().permissionState() == "granted" else {
                call.reject("Location access is off for BCCB Cricket.", "permission_denied")
                return
            }
            guard SessionStore.load() != nil else {
                call.reject("Join Game Day on this phone first.", "no_session")
                return
            }
            let stopAfter = Date(timeIntervalSince1970: (call.getDouble("stopAfter") ?? 0) / 1000)
            if stopAfter.timeIntervalSince1970 > 0, stopAfter <= Date() {
                call.reject("Trip sharing has closed for this game.", "trip_closed")
                return
            }
            let startedAt = TripTracker.shared.start(TripTracker.Config(
                gameDayId: gameDayId,
                groupId: call.getInt("groupId") ?? 0,
                venueLat: venueLat,
                venueLng: venueLng,
                venueName: call.getString("venueName") ?? "the ground",
                stopAfter: stopAfter
            ))
            call.resolve(["started": true, "startedAt": startedAt])
        }
    }

    @objc func stopTrip(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            TripTracker.shared.stop(deleteRemote: false)
            call.resolve(["stopped": true])
        }
    }

    @objc func getTripStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(TripTracker.shared.status())
        }
    }

    @objc func consumeSharedFile(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let file = NativeInbox.shared.takeSharedFile() else {
                call.resolve([:])
                return
            }
            call.resolve(["name": file.name, "mimeType": "application/pdf", "path": file.url.absoluteString])
        }
    }

    @objc func consumeLaunchRoute(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let route = NativeInbox.shared.takeLaunchRoute() {
                call.resolve(["route": route])
            } else {
                call.resolve([:])
            }
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var target = UIApplication.openSettingsURLString
            if call.getString("target") == "notifications", #available(iOS 16.0, *) {
                target = UIApplication.openNotificationSettingsURLString
            }
            if let url = URL(string: target) {
                UIApplication.shared.open(url)
            }
            call.resolve()
        }
    }

    @objc func openExternalUrl(_ call: CAPPluginCall) {
        guard
            let value = call.getString("url"),
            let url = URL(string: value),
            let scheme = url.scheme?.lowercased(),
            ["https", "http", "maps"].contains(scheme)
        else {
            call.reject("That link can't be opened.", "invalid_url")
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.open(url) { opened in
                if opened {
                    call.resolve()
                } else {
                    call.reject("No app on this phone can open that link.", "no_app")
                }
            }
        }
    }

    private func locationService() -> LocationService {
        if let location = location {
            return location
        }
        let service = LocationService()
        location = service
        return service
    }
}

struct LocationFailure: Error {
    let code: String
    let message: String
}

/// While-in-use location access and one-off positions for the alarm recommendation.
final class LocationService: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var permissionCallbacks: [(String) -> Void] = []
    private var positionCallbacks: [(Result<CLLocation, LocationFailure>) -> Void] = []
    private var timeoutWork: DispatchWorkItem?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func permissionState() -> String {
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            return "granted"
        case .denied, .restricted:
            return "denied"
        default:
            return "prompt"
        }
    }

    func requestPermission(_ completion: @escaping (String) -> Void) {
        let state = permissionState()
        guard state == "prompt" else {
            completion(state)
            return
        }
        permissionCallbacks.append(completion)
        manager.requestWhenInUseAuthorization()
    }

    func currentPosition(timeout: TimeInterval, completion: @escaping (Result<CLLocation, LocationFailure>) -> Void) {
        guard permissionState() == "granted" else {
            completion(.failure(LocationFailure(code: "permission_denied", message: "Location access is off for BCCB Cricket.")))
            return
        }
        positionCallbacks.append(completion)
        guard positionCallbacks.count == 1 else {
            return
        }
        manager.requestLocation()
        let work = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            if let last = self.manager.location, -last.timestamp.timeIntervalSinceNow < 300 {
                self.finish(.success(last))
            } else {
                self.finish(.failure(LocationFailure(code: "position_unavailable", message: "We couldn't find your location. Try again outdoors or check Location Services is on.")))
            }
        }
        timeoutWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + timeout, execute: work)
    }

    private func finish(_ result: Result<CLLocation, LocationFailure>) {
        timeoutWork?.cancel()
        timeoutWork = nil
        let callbacks = positionCallbacks
        positionCallbacks.removeAll()
        callbacks.forEach { $0(result) }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let state = permissionState()
        guard state != "prompt", !permissionCallbacks.isEmpty else {
            return
        }
        let callbacks = permissionCallbacks
        permissionCallbacks.removeAll()
        callbacks.forEach { $0(state) }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.last, !positionCallbacks.isEmpty {
            finish(.success(location))
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard !positionCallbacks.isEmpty else {
            return
        }
        if let clError = error as? CLError, clError.code == .locationUnknown {
            return
        }
        if let last = manager.location, -last.timestamp.timeIntervalSinceNow < 300 {
            finish(.success(last))
        } else {
            let denied = (error as? CLError)?.code == .denied
            finish(.failure(LocationFailure(
                code: denied ? "permission_denied" : "position_unavailable",
                message: denied ? "Location access is off for BCCB Cricket." : "We couldn't find your location."
            )))
        }
    }
}
