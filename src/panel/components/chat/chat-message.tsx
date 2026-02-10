interface ChatMessageProps {
  content: string;
}

export function ChatMessage({ content }: ChatMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
        {content}
      </div>
    </div>
  );
}
