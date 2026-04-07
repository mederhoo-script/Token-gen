"use client";

interface DeploymentStatusProps {
  status: "idle" | "deploying" | "success" | "error";
  message?: string;
}

export function DeploymentStatus({ status, message }: DeploymentStatusProps) {
  if (status === "idle") return null;

  const config = {
    deploying: {
      icon: "⏳",
      label: "Deploying contract...",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
    },
    success: {
      icon: "✅",
      label: "Token deployed!",
      cls: "bg-green-50 text-green-700 border-green-200",
    },
    error: { icon: "❌", label: "Deployment failed", cls: "bg-red-50 text-red-700 border-red-200" },
  }[status];

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-4 ${config.cls}`}>
      <span className="text-2xl">{config.icon}</span>
      <div>
        <p className="font-semibold">{config.label}</p>
        {message && <p className="text-sm">{message}</p>}
      </div>
    </div>
  );
}
