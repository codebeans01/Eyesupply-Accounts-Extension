import { h } from "preact";

export function renderReorderBannerDescription(textStr: string, olderOrderName: string | null, api: any, externalReorderLink: string | null) {
  if (!textStr) return null;

  const orderIdTag = "{{order_id}}";
  const clickHereTag = "{{click_here}}";

  // Split the text by <br> tag (handling variations like <br>, <br/>, <br />)
  const lines = textStr.split(/<br\s*\/?>/i);

  return (
    <s-stack direction="block" gap="base">
      {lines.map((line, lIndex) => {
        // Process markers within each line
        const parts = line.split(new RegExp(`(${orderIdTag}|${clickHereTag})`, 'g'));

        return (
          <s-stack key={lIndex} direction="inline" gap="small-400">
            {parts.map((part, pIndex) => {
              if (part === orderIdTag) {
                return (
                  <s-text key={pIndex} type="strong" tone="neutral">
                    {olderOrderName || "Order"}
                  </s-text>
                );
              }
              if (part === clickHereTag) {
                return (
                  <s-link
                    key={pIndex}
                    onClick={() => {
                      if (externalReorderLink) {
                        api.navigation.navigate(externalReorderLink);
                      }
                    }}
                  >
                    <s-text>Click here</s-text>
                  </s-link>
                );
              }
              if (!part) return null;
              return <s-text key={pIndex}>{part}</s-text>;
            })}
          </s-stack>
        );
      })}
    </s-stack>
  );
}
