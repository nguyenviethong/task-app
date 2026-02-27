import { createPortal } from "react-dom";

export default function QuotaPopup({ usage, onClose }) {
  return createPortal (
    <div className="fixed bottom-5 right-5 bg-yellow-100 border border-yellow-400 p-4 rounded shadow">
      <p className="font-bold">⚠ AI quota gần hết</p>
      <p className="text-sm">Usage: {usage}</p>

      <button
        className="mt-2 text-sm text-blue-600"
        onClick={onClose}
      >
        OK
      </button>
    </div>
  );
}
