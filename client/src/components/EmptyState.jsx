import { Inbox } from "lucide-react";

function EmptyState({ icon: Icon = Inbox, title, text, children, compact }) {
  return (
    <div className={`empty-state${compact ? " compact" : ""}`}>
      <div className="empty-state-icon">
        <Icon size={24} />
      </div>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export default EmptyState;
