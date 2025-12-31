import React from "react"
import type { LucideProps } from "lucide-react"

export const CommodityIcon: React.FC<LucideProps> = ({
  size = 24,
  className = "",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12.89 4.596a2.2 2.2 0 0 0-1.78 0l-8.22 3.523a1.72 1.72 0 0 0 0 3.166l4.636 1.987A2.2 2.2 0 0 1 8.65 15.29l-1.076 2.51a1.72 1.72 0 0 0 2.193 2.298l9.088-3.306a2.2 2.2 0 0 0 1.258-1.327l1.305-4.48a1.72 1.72 0 0 0-1.554-2.17l-5.656-.27a2.2 2.2 0 0 1-1.318-.65L12.89 4.597z" />
      <path d="M7.65 16.51c.36.84 0 0 .36.84L5.05 21a2 2 0 0 1-2.05-1.44l-1-3.44a2 2 0 0 1 1.44-2.54l3.5-.96" />
    </svg>
  )
}
