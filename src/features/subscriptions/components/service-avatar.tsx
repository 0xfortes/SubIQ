import { fallbackColor } from "../lib";

/** 30px letter avatar tinted with the service's brand hue at 12%. */
export function ServiceAvatar({
  name,
  color,
}: {
  name: string;
  color: string | null;
}) {
  const hue = color ?? fallbackColor(name);
  return (
    <span
      aria-hidden
      className="flex size-[30px] shrink-0 items-center justify-center rounded-md text-[13px] font-medium"
      style={{ backgroundColor: `${hue}1F`, color: hue }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
