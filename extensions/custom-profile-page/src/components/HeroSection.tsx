export default function HeroSection() {
    return (
        <s-box
            id = "hero-banner"
            padding = "large"
            background = "subdued"
            borderRadius = "base"
            border = "base"
            inlineSize = "100%"
        >
            <s-grid gridTemplateColumns="1fr auto" alignItems="center" gap="base" >
                <s-stack gap="small-100" >
                    <s-heading id="hero-title"> Welcome Back </s-heading>
                    <s-text type="strong" id="user-full-name"> { firstName } { lastName } </s-text>
                </s-stack>
                <s-box>
                    <s-image
                        src={welcomeImageUrl}
                        alt="Welcome Back"
                        inlineSize="auto"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                </s-box>
            </s-grid>
        </s-box>
    )
}