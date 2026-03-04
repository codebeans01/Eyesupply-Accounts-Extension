/**
 * ProfileBlock.jsx — Customer Account UI Extension
 * Target: customer-account.profile.block.render
 */
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";

// Use the direct App URL to bypass Password-protected App Proxy redirects.
const APP_URL = "https://investors-reduction-missed-tcp.trycloudflare.com";

const Extension = () => {
  const [dependants, setDependants] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [pageLoading, setPageLoading] = useState(false);
  const [removingItem, setRemovingItem] = useState(/** @type {any} */ (null));
  const [editingItem, setEditingItem] = useState(/** @type {any} */ (null));
  
  const modalRef = useRef(/** @type {any} */ (null));
  const confirmModalRef = useRef(/** @type {any} */ (null));

  const directUrl = `${APP_URL}/api/dependant/me`;

  const handlePageChange = (/** @type {number} */ newPage) => {
    setPageLoading(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setPageLoading(false);
    }, 400); // Simulated delay for better UX
  };

  useEffect(() => {
    async function init() {
      try {
        const token = await (/** @type {any} */ (shopify)).sessionToken.get();
        const customerId = (/** @type {any} */ (shopify)).authenticatedAccount?.customer?.current?.id;
        
        const res = await fetch(directUrl, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-customer-id": customerId || ""
          },
        });
        if (res.ok) {
          setDependants(await res.json());
        }
      } catch (e) {
        console.error("Initialization failed", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [directUrl]);

  const handleAdd = async (closeOnSuccess = true) => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      const token = await (/** @type {any} */ (shopify)).sessionToken.get();
      const customerId = (/** @type {any} */ (shopify)).authenticatedAccount?.customer?.current?.id;

      const res = await fetch(directUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-customer-id": customerId || ""
        },
        body: JSON.stringify({ firstName, lastName }),
      });
      if (res.ok) {
        const data = await res.json();
        setDependants((prev) => [...prev, data]);
        setFirstName("");
        setLastName("");
        if (closeOnSuccess) {
          modalRef.current?.hideOverlay();
          (/** @type {any} */ (shopify)).toast.show("Dependant added successfully");
        } else {
          (/** @type {any} */ (shopify)).toast.show("Dependant added. You can add another one.");
        }
      }
    } catch (e) {
      console.error("Add failed", e);
      (/** @type {any} */ (shopify)).toast.show("Failed to add dependant");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingItem || !firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      const token = await (/** @type {any} */ (shopify)).sessionToken.get();
      const customerId = (/** @type {any} */ (shopify)).authenticatedAccount?.customer?.current?.id;

      const res = await fetch(directUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-customer-id": customerId || ""
        },
        body: JSON.stringify({ id: editingItem.id, firstName, lastName }),
      });
      if (res.ok) {
        const data = await res.json();
        setDependants((prev) => prev.map((d) => (d.id === data.id ? data : d)));
        modalRef.current?.hideOverlay();
        (/** @type {any} */ (shopify)).toast.show("Dependant updated successfully");
        setEditingItem(null);
        setFirstName("");
        setLastName("");
      }
    } catch (e) {
      console.error("Edit failed", e);
      (/** @type {any} */ (shopify)).toast.show("Failed to update dependant");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (/** @type {any} */ item) => {
    setEditingItem(item);
    setFirstName(item.first_name);
    setLastName(item.last_name);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFirstName("");
    setLastName("");
  };

  const handleRemove = async () => {
    if (!removingItem) return;
    const { id } = removingItem;
    setSaving(true);
    try {
      const token = await (/** @type {any} */ (shopify)).sessionToken.get();
      const customerId = (/** @type {any} */ (shopify)).authenticatedAccount?.customer?.current?.id;

      const res = await fetch(directUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-customer-id": customerId || ""
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setDependants((prev) => prev.filter((d) => d.id !== id));
        (/** @type {any} */ (shopify)).toast.show("Dependant removed");
        confirmModalRef.current?.hideOverlay();
        setRemovingItem(null);
      }
    } catch (e) {
      console.error("Remove failed", e);
      (/** @type {any} */ (shopify)).toast.show("Failed to remove dependant");
    } finally {
      setSaving(false);
    }
  };

  const filtered = dependants.filter((d) =>
    `${d.first_name || ""} ${d.last_name || ""} ${d.full_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <s-section heading="Manage Dependants">
      <s-stack gap="base">
        <s-grid gridTemplateColumns="1fr" gap="base" alignItems="end" justifyContent="space-between">
          <s-text-field
            label="Search"
            value={search}
            onInput={(e) => {
              const target = e.currentTarget;
              if (target) {
                setSearch(target.value);
                setCurrentPage(1);
              }
            }}
            icon="search"
          />
          <s-box inlineSize="100%">
            <s-grid justifyContent="end">
              <s-button 
                variant="primary" 
                onClick={handleOpenAdd}
                command="--show"
                commandFor="add-dependant-modal"
              >
                Add Dependant
              </s-button>
            </s-grid>
          </s-box>
        </s-grid>

        {loading ? (
          <s-spinner />
        ) : filtered.length === 0 ? (
          <s-text color="subdued">No dependants found.</s-text>
        ) : (
          <s-stack gap="none">
            {/* Table Header */}
            <s-grid gridTemplateColumns="1fr 1fr 120px 120px" gap="base" padding="base" background="subdued" borderWidth="base none none none" borderRadius="base base none none">
              <s-text type="strong">First Name</s-text>
              <s-text type="strong">Last Name</s-text>
              <s-text type="strong">Action</s-text>
              <s-text type="strong"></s-text>
            </s-grid>
            
            {/* Table Body Area */}
            {pageLoading ? (
              <s-box padding="base">
                <s-grid alignItems="center" justifyContent="center">
                  <s-spinner />
                </s-grid>
              </s-box>
            ) : (
              <s-stack gap="none">
                {currentItems.map((d, index) => (
                  <s-grid 
                    key={d.id} 
                    gridTemplateColumns="1fr 1fr 120px 120px" 
                    gap="base" 
                    padding="base" 
                    borderWidth="base none none none"
                    background={index % 2 === 0 ? "transparent" : "subdued"}
                  >
                    <s-text>{d.first_name}</s-text>
                    <s-text>{d.last_name}</s-text>
                    <s-button 
                      variant="secondary" 
                      onClick={() => handleOpenEdit(d)}
                      command="--show"
                      commandFor="add-dependant-modal"
                    >
                      Edit
                    </s-button>
                    <s-button 
                      tone="critical" 
                      variant="secondary" 
                      command="--show"
                      commandFor="confirm-remove-modal"
                      onClick={() => setRemovingItem(d)}
                    >
                      Remove
                    </s-button>
                  </s-grid>
                ))}
              </s-stack>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <s-box padding="base" borderWidth="base none none none">
                <s-grid gridTemplateColumns="1fr auto 1fr" gap="base" alignItems="center">
                  <s-button
                    disabled={currentPage === 1 || pageLoading}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </s-button>
                  <s-text>
                    Page {currentPage} of {totalPages}
                  </s-text>
                  <s-box inlineSize="100%">
                    <s-grid justifyContent="end">
                      <s-button
                        disabled={currentPage === totalPages || pageLoading}
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        Next
                      </s-button>
                    </s-grid>
                  </s-box>
                </s-grid>
              </s-box>
            )}
          </s-stack>
        )}

        {/* Add/Edit Dependant Modal */}
        <s-modal id="add-dependant-modal" ref={modalRef} heading={editingItem ? "Edit Dependant" : "Add New Dependant"}>
          <s-stack gap="base" padding="base">
            <s-text-field
              label="First Name"
              value={firstName}
              onInput={(e) => {
                const target = e.currentTarget;
                if (target) setFirstName(target.value);
              }}
              required
            />
            <s-text-field
              label="Last Name"
              value={lastName}
              onInput={(e) => {
                const target = e.currentTarget;
                if (target) setLastName(target.value);
              }}
              required
            />
          </s-stack>
          {editingItem ? (
            <s-button
              slot="primary-action"
              variant="primary"
              onClick={handleEdit}
              loading={saving}
              disabled={!firstName.trim() || !lastName.trim() || saving}
            >
              Save Changes
            </s-button>
          ) : (
            <>
              <s-button
                slot="primary-action"
                variant="primary"
                onClick={() => handleAdd(true)}
                loading={saving}
                disabled={!firstName.trim() || !lastName.trim() || saving}
              >
                Add & Close
              </s-button>
              <s-button
                slot="secondary-actions"
                onClick={() => handleAdd(false)}
                loading={saving}
                disabled={!firstName.trim() || !lastName.trim() || saving}
              >
                Add & Add More
              </s-button>
            </>
          )}
          <s-button slot="secondary-actions" command="--hide" commandFor="add-dependant-modal">
            Cancel
          </s-button>
        </s-modal>

        {/* Remove Confirmation Modal */}
        <s-modal id="confirm-remove-modal" ref={confirmModalRef} heading="Confirm Removal">
          <s-stack gap="base" padding="base">
            <s-text>
              Are you sure you want to remove{" "}
              <s-text type="strong">
                {removingItem?.first_name} {removingItem?.last_name}
              </s-text>
              ? This action cannot be undone.
            </s-text>
          </s-stack>
          <s-button
            slot="primary-action"
            tone="critical"
            variant="primary"
            onClick={handleRemove}
            loading={saving}
          >
            Remove
          </s-button>
          <s-button slot="secondary-actions" command="--hide" commandFor="confirm-remove-modal">
            Cancel
          </s-button>
        </s-modal>

      </s-stack>
    </s-section>
  );
};

export default async () => {
  render(<Extension />, document.body);
};
