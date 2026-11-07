import Image from 'next/image';

/** Shared image identity for the landing page, authentication, and app navigation. */
export function BrandMark() {
  return (
    <Image
      src="/agencyos-logo.png"
      alt="AgencyOS"
      width={40}
      height={40}
      className="h-10 w-10 shrink-0 rounded-lg"
    />
  );
}
