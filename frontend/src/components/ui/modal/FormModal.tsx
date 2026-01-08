import { Modal } from "@/components/ui/modal/Modal";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  widthClass = "max-w-xl md:max-w-3xl",
}: FormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div
        className={`${widthClass} rounded-2xl bg-white p-6 dark:bg-gray-900`}>
        {/* HEADER */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            {title}
          </h3>
        </div>

        {/* BODY */}
        <div className="space-y-4">{children}</div>

        {/* FOOTER */}
        {footer && (
          <div className="mt-8 flex justify-end gap-4">{footer}</div>
        )}
      </div>
    </Modal>
  );
}
