type Props = {
  message: string;
};

export default function EmptyState({ message }: Props) {
  return (
    <div className="text-center py-12 text-gray-400 text-sm">{message}</div>
  );
}
