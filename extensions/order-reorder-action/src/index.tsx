import { render } from "preact";

/**
 * ReorderButton component for customer-account.order.action.menu-item.render target.
 * We do NOT add an onClick here. By leaving it as a simple button, 
 * Shopify will automatically trigger the customer-account.order.action.render target 
 * (implemented in action-modal.tsx) when this button is clicked.
 */
function ReorderButton() {
  return (
    <s-button>
      Reorder
    </s-button>
  );
}

export default () => {
  render(<ReorderButton />, document.body);
};
