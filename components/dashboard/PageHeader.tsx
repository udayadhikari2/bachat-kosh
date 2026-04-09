import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">{title}</h1>
        </div>
        {description && <p className="text-slate-400 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
