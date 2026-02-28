import { cn } from "@/lib/utils"

interface NinjaIconProps {
  className?: string
}

export function NinjaIcon({ className }: NinjaIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-4", className)}
    >
      {/* Full ninja head/face - black circle */}
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      
      {/* Headband - red band across the face */}
      <rect x="2" y="9" width="20" height="4" fill="#DC2626" />
      
      {/* Headband knot on left side */}
      <circle cx="4" cy="11" r="2" fill="#DC2626" />
      
      {/* Headband tails flowing left */}
      <path
        d="M2 10 C0 9, -1 11, 0 12"
        stroke="#DC2626"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M2 12 C0 12, -1 14, 0 15"
        stroke="#DC2626"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Eyes - white with black pupils, showing through mask opening */}
      <ellipse cx="8" cy="11" rx="2.5" ry="1.8" fill="white" />
      <ellipse cx="16" cy="11" rx="2.5" ry="1.8" fill="white" />
      <circle cx="8.5" cy="11" r="1" fill="currentColor" />
      <circle cx="16.5" cy="11" r="1" fill="currentColor" />
    </svg>
  )
}
