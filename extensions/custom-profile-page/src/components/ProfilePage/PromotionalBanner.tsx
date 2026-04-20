import { h } from "preact";

interface PromotionalBannerProps {
  enable: boolean;
  imageUrl: string;
  link?: string;
}

export function PromotionalBanner({ enable, imageUrl, link }: PromotionalBannerProps) {
  if (!enable || !imageUrl) return null;

  const BannerContent = (
    <s-stack direction="inline" justifyContent="center" inlineSize="100%">
      <s-box 
        borderRadius="large" 
        overflow="hidden" 
        padding="none" 
        inlineSize="auto"
        maxInlineSize="100%"
        border="none"
      >
        <s-image 
          src={imageUrl} 
          alt="Promotional Banner" 
          loading="lazy" 
          objectFit="contain"
          inlineSize="auto"
        ></s-image>
      </s-box>
    </s-stack>
  );

  if (link && link !== "#") {
    return (
      <s-clickable href={link}>
        {BannerContent}
      </s-clickable>
    );
  }

  return BannerContent;
}
