import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      duration={6000}
      toastOptions={{
        classNames: {
          toast:
            "bg-[hsl(252,20%,12%)]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50",
          title: "text-white font-semibold",
          description: "text-white/60",
          success: "border-l-4 border-l-emerald-500",
          warning: "border-l-4 border-l-orange-500",
          error: "border-l-4 border-l-red-500",
          info: "border-l-4 border-l-violet-500",
          actionButton: "bg-violet-500 text-white hover:bg-violet-600",
          cancelButton: "bg-white/10 text-white/70 hover:bg-white/20",
        },
      }}
      style={
        {
          "--normal-bg": "hsl(252, 20%, 12%)",
          "--normal-text": "hsl(0, 0%, 100%)",
          "--normal-border": "hsl(0, 0%, 100%, 0.1)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster, toast };
