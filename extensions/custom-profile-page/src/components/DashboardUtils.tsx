export function renderReorderBannerDescription(textStr: string, olderOrderName: string | null, api: any, externalReorderLink: string | null) {
  if (!textStr) return null;

  const orderIdTag = "{{order_id}}";
  const clickHereTag = "{{click_here}}";

  const parts = textStr.split(new RegExp(`(${orderIdTag}|${clickHereTag})`, 'g'));

  return (
    <s-stack direction="block" gap="small">
      <s-text>
        {parts.map((part, index) => {
          if (part === orderIdTag) {
            return <s-text key={index} emphasis="bold">{olderOrderName || "Order"}</s-text>;
          }
          if (part === clickHereTag) {
            return (
              <s-link
                key={index}
                onClick={() => {
                  if (externalReorderLink) {
                    api.navigation.navigate(externalReorderLink);
                  }
                }}
              >
                click here
              </s-link>
            );
          }
          return part;
        })}
      </s-text>
    </s-stack>
  );
}
