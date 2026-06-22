export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  text: string;
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function Toast({ messages, onDismiss }: ToastProps) {
  return (
    <div className="toast-stack" aria-live="polite">
      {messages.map((message) => (
        <button
          type="button"
          key={message.id}
          className={`toast toast-${message.tone}`}
          onClick={() => onDismiss(message.id)}
        >
          {message.text}
        </button>
      ))}
    </div>
  );
}
