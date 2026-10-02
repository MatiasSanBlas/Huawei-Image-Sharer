import Image from 'next/image'

export default function BrandLogo() {
  return (
    <span className="brand">
      <Image
        src="/huawei-cloud-logo.png"
        alt="Huawei Cloud"
        width={180}
        height={36}
        className="brand-image"
      />
    </span>
  )
}
