import CoreLocation
import Foundation
import UIKit
import UserNotifications

/// Shares the player's live location with the group while they travel to the ground. Uses
/// while-in-use location with background updates (the blue status-bar indicator stays visible).
final class TripTracker: NSObject, CLLocationManagerDelegate {
    static let shared = TripTracker()

    struct Config {
        let gameDayId: String
        let groupId: Int
        let venueLat: Double
        let venueLng: Double
        let venueName: String
        let stopAfter: Date
    }

    private static let stateKey = "bccb.trip"
    private static let minUploadInterval: TimeInterval = 15
    private static let arrivalRadius: CLLocationDistance = 150

    var onStatus: (([String: Any]) -> Void)?
    private var manager: CLLocationManager?
    private var stopTimer: Timer?
    private var lastUploadAt: Date?
    private var uploadInFlight = false

    private var state: [String: Any] {
        get { UserDefaults.standard.dictionary(forKey: TripTracker.stateKey) ?? [:] }
        set { UserDefaults.standard.set(newValue, forKey: TripTracker.stateKey) }
    }

    private var stopAfter: Date {
        Date(timeIntervalSince1970: state["stopAfter"] as? Double ?? 0)
    }

    /** When the current trip started on this phone, in whole milliseconds. Also identifies the trip to the server. */
    private var tripStartedAt: Double? {
        state["startedAt"] as? Double
    }

    @discardableResult
    func start(_ config: Config) -> Double {
        stopUpdates()
        let startedAt = (Date().timeIntervalSince1970 * 1000).rounded()
        state = [
            "active": true,
            "arrived": false,
            "gameDayId": config.gameDayId,
            "groupId": config.groupId,
            "venueLat": config.venueLat,
            "venueLng": config.venueLng,
            "venueName": config.venueName,
            "stopAfter": config.stopAfter.timeIntervalSince1970,
            "startedAt": startedAt
        ]
        lastUploadAt = nil
        beginUpdates()
        publish()
        return startedAt
    }

    /// Resumes sharing after the app was relaunched mid-trip, or marks the trip finished.
    func resumeIfNeeded() {
        guard state["active"] as? Bool == true, manager == nil else {
            return
        }
        let status = CLLocationManager().authorizationStatus
        if stopAfter <= Date() || !(status == .authorizedWhenInUse || status == .authorizedAlways) {
            finish(arrived: false, deleteRemote: false, error: nil)
        } else {
            beginUpdates()
            publish()
        }
    }

    func stop(deleteRemote: Bool) {
        finish(arrived: false, deleteRemote: deleteRemote, error: nil)
    }

    func status() -> [String: Any] {
        let current = state
        var result: [String: Any] = [
            "active": current["active"] as? Bool ?? false,
            "arrived": current["arrived"] as? Bool ?? false
        ]
        for key in ["gameDayId", "startedAt", "lastUpdateAt", "lastError"] {
            if let value = current[key] {
                result[key] = value
            }
        }
        return result
    }

    private func publish() {
        onStatus?(status())
    }

    /// True while `trip` is still the trip being shared; replies for earlier trips are ignored.
    private func isCurrentTrip(_ trip: Double?) -> Bool {
        state["active"] as? Bool == true && tripStartedAt == trip
    }

    private func beginUpdates() {
        let manager = CLLocationManager()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 20
        manager.activityType = .automotiveNavigation
        manager.pausesLocationUpdatesAutomatically = false
        manager.allowsBackgroundLocationUpdates = true
        manager.showsBackgroundLocationIndicator = true
        manager.startUpdatingLocation()
        self.manager = manager

        stopTimer?.invalidate()
        let remaining = stopAfter.timeIntervalSinceNow
        if remaining > 0 {
            stopTimer = Timer.scheduledTimer(withTimeInterval: remaining, repeats: false) { [weak self] _ in
                self?.finish(arrived: false, deleteRemote: false, error: nil)
            }
        }
    }

    private func stopUpdates() {
        stopTimer?.invalidate()
        stopTimer = nil
        manager?.stopUpdatingLocation()
        manager?.delegate = nil
        manager = nil
        uploadInFlight = false
    }

    private func update(_ changes: [String: Any?]) {
        var current = state
        for (key, value) in changes {
            if let value = value {
                current[key] = value
            } else {
                current.removeValue(forKey: key)
            }
        }
        state = current
    }

    // MARK: - CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last, state["active"] as? Bool == true else {
            return
        }
        if stopAfter <= Date() {
            finish(arrived: false, deleteRemote: false, error: nil)
            return
        }
        let venue = CLLocation(latitude: state["venueLat"] as? Double ?? 0, longitude: state["venueLng"] as? Double ?? 0)
        let nearVenue = location.distance(from: venue) <= TripTracker.arrivalRadius
        if !nearVenue, let last = lastUploadAt, Date().timeIntervalSince(last) < TripTracker.minUploadInterval {
            return
        }
        guard !uploadInFlight else {
            return
        }
        lastUploadAt = Date()
        upload(location)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if (error as? CLError)?.code == .denied {
            finish(arrived: false, deleteRemote: false, error: "Location access is off.")
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .denied, .restricted:
            finish(arrived: false, deleteRemote: false, error: "Location access is off.")
        default:
            break
        }
    }

    // MARK: - Uploads

    private func upload(_ location: CLLocation) {
        guard let session = SessionStore.load(), let gameDayId = state["gameDayId"] as? String else {
            finish(arrived: false, deleteRemote: false, error: "Sign in to your group again to share your trip.")
            return
        }
        var body: [String: Any] = ["lat": location.coordinate.latitude, "lng": location.coordinate.longitude]
        if location.horizontalAccuracy >= 0 {
            body["accuracy"] = min(location.horizontalAccuracy, 100_000)
        }
        if location.course >= 0 {
            body["heading"] = location.course
        }
        if location.speed >= 0 {
            body["speed"] = min(location.speed, 150)
        }
        let trip = tripStartedAt
        if let trip = trip, trip > 0 {
            body["tripStartedAt"] = Int64(trip)
        }
        uploadInFlight = true
        var backgroundTask = UIBackgroundTaskIdentifier.invalid
        backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "bccb-trip-upload") {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
        SessionStore.request(session, method: "POST", path: "/game-days/\(gameDayId)/trip", body: body) { [weak self] status, json, networkError in
            DispatchQueue.main.async {
                defer {
                    if backgroundTask != .invalid {
                        UIApplication.shared.endBackgroundTask(backgroundTask)
                    }
                }
                guard let self = self, self.isCurrentTrip(trip) else {
                    return
                }
                self.uploadInFlight = false
                if (200..<300).contains(status) {
                    self.update(["lastUpdateAt": Date().timeIntervalSince1970 * 1000, "lastError": nil])
                    self.publish()
                    if json["arrived"] as? Bool == true {
                        self.finish(arrived: true, deleteRemote: false, error: nil)
                    }
                } else if networkError || status == 0 || status == 429 || status >= 500 {
                    self.update(["lastError": "No connection. Retrying…"])
                    self.publish()
                } else {
                    self.finish(arrived: false, deleteRemote: false, error: json["error"] as? String ?? "Trip sharing stopped.")
                }
            }
        }
    }

    private func finish(arrived: Bool, deleteRemote: Bool, error: String?) {
        let wasActive = state["active"] as? Bool == true
        let gameDayId = state["gameDayId"] as? String
        let groupId = state["groupId"] as? Int ?? 0
        let venueName = state["venueName"] as? String ?? "the ground"
        stopUpdates()
        update(["active": false, "arrived": arrived, "lastError": error])
        publish()
        guard wasActive, let gameDayId = gameDayId else {
            return
        }
        if arrived {
            let content = UNMutableNotificationContent()
            content.title = "🏏 You've arrived"
            content.body = "You made it to \(venueName). Trip sharing has stopped."
            content.sound = .default
            content.userInfo = ["type": "arrived", "gameDayId": gameDayId, "groupId": groupId, "route": "bccb://game-day/\(gameDayId)"]
            UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "arrived-\(gameDayId)", content: content, trigger: nil))
        }
        if deleteRemote, let session = SessionStore.load() {
            let marker = tripStartedAt.map { "?tripStartedAt=\(Int64($0))" } ?? ""
            SessionStore.request(session, method: "DELETE", path: "/game-days/\(gameDayId)/trip\(marker)") { _, _, _ in }
        }
    }
}
