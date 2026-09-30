import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "primary" | "success" | "info" | "warm";
  delay?: number;
};

const variantClasses: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-gradient-primary",
  success: "bg-gradient-success",
  info: "bg-gradient-info",
  warm: "bg-gradient-warm",
};

export function StatCard({ label, value, icon: Icon, trend, variant = "primary", delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="p-5 rounded-2xl shadow-soft hover:shadow-elevated transition-shadow border-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
            {trend && <p className="mt-1 text-xs text-success">{trend}</p>}
          </div>
          <div className={cn("h-11 w-11 rounded-xl grid place-items-center text-primary-foreground shadow-glow", variantClasses[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
