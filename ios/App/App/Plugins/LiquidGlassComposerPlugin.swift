import Foundation
import Capacitor
import UIKit
import SwiftUI

@objc(LiquidGlassComposerPlugin)
public class LiquidGlassComposerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiquidGlassComposerPlugin"
    public let jsName = "LiquidGlassComposer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show",           returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide",           returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPlaceholder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setStreaming",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setDisabled",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear",          returnType: CAPPluginReturnPromise),
    ]

    private var overlayVC: UIViewController?
    private let vm = ComposerViewModel()
    private var bottomConstraint: NSLayoutConstraint?

    override public func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillShow(_:)),
            name: UIResponder.keyboardWillShowNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillHide(_:)),
            name: UIResponder.keyboardWillHideNotification, object: nil)
    }

    @objc private func keyboardWillShow(_ n: Notification) {
        guard let info = n.userInfo,
              let frame = (info[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue,
              let duration = info[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double
        else { return }
        DispatchQueue.main.async { [weak self] in
            self?.bottomConstraint?.constant = -frame.height
            UIView.animate(withDuration: duration) {
                self?.bridge?.viewController?.view.layoutIfNeeded()
            }
        }
    }

    @objc private func keyboardWillHide(_ n: Notification) {
        guard let duration = n.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double else { return }
        DispatchQueue.main.async { [weak self] in
            self?.bottomConstraint?.constant = 0
            UIView.animate(withDuration: duration) {
                self?.bridge?.viewController?.view.layoutIfNeeded()
            }
        }
    }

    @objc func show(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            if self.overlayVC == nil { self.setupOverlay() }
            self.overlayVC?.view.isHidden = false
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.overlayVC?.view.isHidden = true
            call.resolve()
        }
    }

    @objc func setPlaceholder(_ call: CAPPluginCall) {
        let v = call.getString("value") ?? "Ask anything..."
        DispatchQueue.main.async { [weak self] in self?.vm.placeholder = v }
        call.resolve()
    }

    @objc func setStreaming(_ call: CAPPluginCall) {
        let v = call.getBool("value") ?? false
        DispatchQueue.main.async { [weak self] in self?.vm.isStreaming = v }
        call.resolve()
    }

    @objc func setDisabled(_ call: CAPPluginCall) {
        let v = call.getBool("value") ?? false
        DispatchQueue.main.async { [weak self] in self?.vm.isDisabled = v }
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in self?.vm.text = "" }
        call.resolve()
    }

    private func setupOverlay() {
        guard let hostVC = bridge?.viewController else { return }
        vm.onSend = { [weak self] text in self?.notifyListeners("send", data: ["value": text]) }
        vm.onStop = { [weak self] in self?.notifyListeners("stop", data: [:]) }

        let rootView: AnyView
        if #available(iOS 26.0, *) {
            rootView = AnyView(GlassComposerBarView(vm: vm))
        } else {
            rootView = AnyView(ComposerBarView(vm: vm))
        }
        let hosting = UIHostingController(rootView: rootView)
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        hosting.view.backgroundColor = .clear

        hostVC.addChild(hosting)
        hostVC.view.addSubview(hosting.view)
        hosting.didMove(toParent: hostVC)

        let bottom = hosting.view.bottomAnchor.constraint(equalTo: hostVC.view.bottomAnchor)
        bottomConstraint = bottom
        NSLayoutConstraint.activate([
            hosting.view.leadingAnchor.constraint(equalTo: hostVC.view.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: hostVC.view.trailingAnchor),
            bottom,
        ])

        overlayVC = hosting
    }
}
