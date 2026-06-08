"use client";

interface Props {
  message: string;
  onApprove: () => void;
  onDeny: () => void;
}

/** Human-in-the-loop gate: the graph paused (interrupt) before a web search. */
export function ApprovalGate({ message, onApprove, onDeny }: Props) {
  return (
    <div className="gate animate-fade-in">
      <div className="gate__pulse" />
      <div className="gate__title">Human approval</div>
      <div className="gate__msg">{message}</div>
      <div className="gate__actions">
        <button className="btn btn--approve" onClick={onApprove}>
          Approve web search
        </button>
        <button className="btn btn--deny" onClick={onDeny}>
          Deny
        </button>
      </div>
    </div>
  );
}
