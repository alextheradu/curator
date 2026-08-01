import SwiftUI

final class ComposerViewModel: ObservableObject {
    @Published var text: String = ""
    @Published var placeholder: String = "Ask anything..."
    @Published var isStreaming: Bool = false
    @Published var isDisabled: Bool = false
    var onSend: ((String) -> Void)?
    var onStop: (() -> Void)?
}

struct ComposerBarView: View {
    @ObservedObject var vm: ComposerViewModel
    @FocusState private var focused: Bool

    var canSend: Bool {
        !vm.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !vm.isDisabled && !vm.isStreaming
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField(vm.placeholder, text: $vm.text, axis: .vertical)
                .lineLimit(1...6)
                .font(.system(size: 16))
                .padding(.vertical, 10)
                .focused($focused)
                .disabled(vm.isDisabled)
                .submitLabel(.send)
                .onSubmit(sendAction)

            actionButton
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 6)
        .background { glassBackground }
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(.white.opacity(0.12), lineWidth: 0.5)
        )
        .padding(.horizontal, 12)
        .padding(.bottom, 8)
        .animation(.spring(duration: 0.2), value: vm.text.isEmpty)
        .animation(.spring(duration: 0.2), value: vm.isStreaming)
    }

    @ViewBuilder
    private var glassBackground: some View {
        if #available(iOS 26.0, *) {
            Color.clear
        } else {
            Rectangle().fill(.ultraThinMaterial)
        }
    }

    @ViewBuilder
    private var actionButton: some View {
        if vm.isStreaming {
            Button(action: { vm.onStop?() }) {
                Image(systemName: "square.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.primary)
                    .frame(width: 30, height: 30)
                    .background(.white.opacity(0.15))
                    .clipShape(Circle())
            }
            .transition(.scale(scale: 0.7).combined(with: .opacity))
        } else {
            Button(action: sendAction) {
                Image(systemName: "arrow.up")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(canSend ? Color(UIColor.systemBackground) : .secondary)
                    .frame(width: 30, height: 30)
                    .background(canSend ? Color.primary : Color.primary.opacity(0.15))
                    .clipShape(Circle())
            }
            .disabled(!canSend)
            .transition(.scale(scale: 0.7).combined(with: .opacity))
        }
    }

    private func sendAction() {
        let trimmed = vm.text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        vm.onSend?(trimmed)
        vm.text = ""
        focused = false
    }
}

@available(iOS 26.0, *)
struct GlassComposerBarView: View {
    @ObservedObject var vm: ComposerViewModel

    var body: some View {
        ComposerBarView(vm: vm)
            .glassEffect(in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}
