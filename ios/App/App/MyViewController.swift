import UIKit
import Capacitor

// `@objc(MyViewController)` makes the class findable by name from Main.storyboard
// even though Swift normally namespaces classes under their module (App). Without
// it, IB silently falls back to a plain UIViewController and no Capacitor code runs.
@objc(MyViewController)
class MyViewController: CAPBridgeViewController {

    private var loadingOverlay: UIView?
    private var errorOverlay: UIView?
    private var loadTimer: Timer?
    private var timerTicks = 0
    private var hasSeenLoading = false
    private var overlayDismissed = false

    // MARK: - Capacitor lifecycle

    override open func capacitorDidLoad() {
        NSLog("[Curator] ▶︎ capacitorDidLoad: entered. bridge=%@, webView=%@",
              String(describing: bridge),
              String(describing: webView))

        // Required on iOS 16.4+ to attach Safari Web Inspector. Has no effect
        // in App Store builds; only matters when a dev tool is connected.
        if #available(iOS 16.4, *) {
            webView?.isInspectable = true
        }

        // Show overlay FIRST so the user always sees feedback, even if later
        // setup throws. Previously the plugin registration ran first and a
        // crash there left the screen black with no splash.
        showLoadingOverlay()
        NSLog("[Curator] ▶︎ capacitorDidLoad: loading overlay shown")

        // Poll every 0.5 s — simpler and more reliable than KVO.
        // .common mode ensures the timer fires even during scroll / touch tracking.
        let timer = Timer(timeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkWebViewReady()
        }
        RunLoop.main.add(timer, forMode: .common)
        loadTimer = timer
        NSLog("[Curator] ▶︎ capacitorDidLoad: ready-check timer scheduled")

        // Liquid Glass composer disabled: suspected cause of the black-screen-on-launch
        // regression. Re-enable only after confirming the plugin loads cleanly on the
        // target iOS SDK. The JS side in components/chat/ChatWindow.tsx already falls
        // back to the web InputBar when the plugin isn't registered.
        // bridge?.registerPluginInstance(LiquidGlassComposerPlugin())

        NSLog("[Curator] ▶︎ capacitorDidLoad: completed (plugin registration skipped)")
    }

    // MARK: - Loading check

    private func checkWebViewReady() {
        timerTicks += 1

        // Hard timeout: always dismiss after 15 s and check if anything loaded
        if timerTicks >= 30 {
            NSLog("[Curator] ⏱ timeout reached (15s). hasSeenLoading=%@, url=%@",
                  hasSeenLoading ? "true" : "false",
                  String(describing: webView?.url))
            dismissLoadingOverlay()
            // If nothing ever started loading, the server is unreachable
            if !hasSeenLoading { showErrorOverlay() }
            return
        }

        guard let wv = webView else {
            if timerTicks % 4 == 0 {
                NSLog("[Curator] ⏳ tick %d: webView still nil", timerTicks)
            }
            return
        }

        if wv.isLoading { hasSeenLoading = true }

        if timerTicks % 4 == 0 {
            NSLog("[Curator] ⏳ tick %d: isLoading=%@, url=%@",
                  timerTicks,
                  wv.isLoading ? "true" : "false",
                  String(describing: wv.url))
        }

        // Dismiss when loading stops, whether via success or navigation failure
        if !wv.isLoading && (wv.url != nil || hasSeenLoading) {
            NSLog("[Curator] ✓ webView finished loading, dismissing overlay")
            dismissLoadingOverlay()
        }
    }

    // MARK: - Loading overlay

    private func showLoadingOverlay() {
        let overlay = UIView()
        overlay.backgroundColor = UIColor(red: 15/255, green: 15/255, blue: 15/255, alpha: 1)
        overlay.translatesAutoresizingMaskIntoConstraints = false

        let splash = UIImageView(image: UIImage(named: "Splash"))
        splash.contentMode = .scaleAspectFit
        splash.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(splash)

        let spinner = UIActivityIndicatorView(style: .medium)
        spinner.color = UIColor.white.withAlphaComponent(0.4)
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.startAnimating()
        overlay.addSubview(spinner)

        view.addSubview(overlay)
        loadingOverlay = overlay

        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            splash.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            splash.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            splash.widthAnchor.constraint(lessThanOrEqualTo: overlay.widthAnchor),
            splash.heightAnchor.constraint(lessThanOrEqualTo: overlay.heightAnchor),
            spinner.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            spinner.bottomAnchor.constraint(equalTo: overlay.safeAreaLayoutGuide.bottomAnchor, constant: -32),
        ])
    }

    private func dismissLoadingOverlay() {
        guard !overlayDismissed else { return }
        overlayDismissed = true
        loadTimer?.invalidate()
        loadTimer = nil

        UIView.animate(withDuration: 0.35, delay: 0, options: .curveEaseInOut) {
            self.loadingOverlay?.alpha = 0
        } completion: { _ in
            self.loadingOverlay?.removeFromSuperview()
            self.loadingOverlay = nil
        }
    }

    // MARK: - Error overlay

    private func showErrorOverlay() {
        guard errorOverlay == nil else { return }

        let overlay = UIView()
        overlay.backgroundColor = UIColor(red: 15/255, green: 15/255, blue: 15/255, alpha: 1)
        overlay.translatesAutoresizingMaskIntoConstraints = false

        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Unable to connect"
        titleLabel.font = .systemFont(ofSize: 20, weight: .semibold)
        titleLabel.textColor = .white

        let subtitleLabel = UILabel()
        subtitleLabel.text = "Check your internet connection and try again."
        subtitleLabel.font = .systemFont(ofSize: 14)
        subtitleLabel.textColor = UIColor.white.withAlphaComponent(0.5)
        subtitleLabel.textAlignment = .center
        subtitleLabel.numberOfLines = 0

        let retryButton = UIButton(type: .system)
        retryButton.setTitle("Retry", for: .normal)
        retryButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        retryButton.setTitleColor(.black, for: .normal)
        retryButton.backgroundColor = .white
        retryButton.layer.cornerRadius = 20
        retryButton.translatesAutoresizingMaskIntoConstraints = false
        retryButton.addTarget(self, action: #selector(retryLoad), for: .touchUpInside)

        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(subtitleLabel)
        stack.addArrangedSubview(retryButton)
        stack.setCustomSpacing(24, after: subtitleLabel)

        overlay.addSubview(stack)
        view.addSubview(overlay)
        errorOverlay = overlay

        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            stack.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: overlay.leadingAnchor, constant: 40),
            retryButton.widthAnchor.constraint(equalToConstant: 120),
            retryButton.heightAnchor.constraint(equalToConstant: 40),
        ])
    }

    @objc private func retryLoad() {
        errorOverlay?.removeFromSuperview()
        errorOverlay = nil
        overlayDismissed = false
        timerTicks = 0
        hasSeenLoading = false
        showLoadingOverlay()

        let timer = Timer(timeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkWebViewReady()
        }
        RunLoop.main.add(timer, forMode: .common)
        loadTimer = timer

        webView?.reload()
    }
}
