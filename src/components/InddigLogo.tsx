import LogoEye from '@/assets/logo-eye1.webp';

export default function InddigLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Inddig Media"
    >
      <defs>
        <clipPath id="logo-clip">
          <rect width="48" height="48" rx="12" />
        </clipPath>
      </defs>
      <image
        href={LogoEye.src}
        x="0"
        y="0"
        width="48"
        height="48"
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#logo-clip)"
      />
    </svg>
  );
}
