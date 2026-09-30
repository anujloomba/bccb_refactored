import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        // bccb:// links and PDFs opened with "Open in BCCB Cricket" while the app was closed.
        connectionOptions.urlContexts.forEach { NativeInbox.shared.handle(url: $0.url, coldStart: true) }
        #if DEBUG
        // CI screenshots open pages with `simctl launch <device> <app> -BCCBOpenRoute bccb://page/teams`,
        // because `simctl openurl` stops at the system "Open in BCCB Cricket?" prompt.
        if let route = UserDefaults.standard.string(forKey: "BCCBOpenRoute"), let url = URL(string: route) {
            NativeInbox.shared.handle(url: url, coldStart: true)
        }
        #endif
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        URLContexts.forEach { NativeInbox.shared.handle(url: $0.url, coldStart: false) }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
