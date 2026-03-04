/**
 * ProfileBlock.tsx — Customer Account UI Extension
 * Target: customer-account.profile.block.render
 */
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";

interface Dependant {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
}

interface NewRow {
  id: number;
  fn: string;
  ln: string;
}

// Declare shopify global
declare const shopify: any;

// Use the direct App URL to bypass Password-protected App Proxy redirects.
const APP_URL = "https://erik-emphasis-italia-tournaments.trycloudflare.com";

const Extension = () => {
  const [dependants, setDependants] = useState<Dependant[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [newRows, setNewRows] = useState<NewRow[]>([{ id: 1, fn: "", ln: "" }]);
  const [nextRowId, setNextRowId] = useState(2);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [pageLoading, setPageLoading] = useState(false);
  const [removingItem, setRemovingItem] = useState<Dependant | null>(null);
  const [editingItem, setEditingItem] = useState<Dependant | null>(null);

  // Extension Settings & Metafields
  const settings = shopify.settings?.current?.value || {};
  const meta = shopify.extension?.metafields?.current?.value || [];
  
  const m = (key: string) => meta.find((f: any) => f.key === key)?.value;

  const prevLabel = m("pagination_previous_text") || settings.pagination_previous_text || "Previous";
  const nextLabel = m("pagination_next_text") || settings.pagination_next_text || "Next";
  const paginationEnabled = (m("pagination_enabled") ?? settings.pagination_enabled) !== false;

  const modalRef = useRef<any>(null);
  const confirmModalRef = useRef<any>(null);

  const directUrl = `${APP_URL}/api/dependant/me`;

  const handlePageChange = (newPage: number) => {
    setPageLoading(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setPageLoading(false);
    }, 400);
  };

  useEffect(() => {
    async function init() {
      try {
        const token = await shopify.sessionToken.get();
        const customerId = shopify.authenticatedAccount?.customer?.current?.id;
        
        const res = await fetch(directUrl, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-customer-id": customerId || ""
          },
        });
        if (res.ok) {
          const data = await res.json();
          setDependants(Array.isArray(data) ? data.reverse() : []);
        }
      } catch (e) {
        console.error("Initialization failed", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [directUrl]);

  const handleBulkAdd = async () => {
    const valid = newRows.filter(r => r.fn.trim() && r.ln.trim());
    if (valid.length === 0) {
      shopify.toast.show("Please fill in at least one row.");
      return;
    }
    setSaving(true);
    let saved = 0;
    try {
      const token = await shopify.sessionToken.get();
      const customerId = shopify.authenticatedAccount?.customer?.current?.id;
      for (const row of valid) {
        try {
          const res = await fetch(directUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "x-customer-id": customerId || ""
            },
            body: JSON.stringify({ firstName: row.fn.trim(), lastName: row.ln.trim() }),
          });
          if (res.ok) {
            const data = await res.json();
            setDependants((prev) => [data, ...prev]);
            saved++;
          }
        } catch (e) {
          console.error("Bulk add row failed", e); 
        }
      }
      if (saved > 0) {
        setNewRows([{ id: 1, fn: "", ln: "" }]);
        setNextRowId(2);
        modalRef.current?.hideOverlay();
        shopify.toast.show(`${saved} dependant${saved > 1 ? "s" : ""} added successfully`);
      }
    } catch (e) {
      console.error("Bulk add failed", e);
      shopify.toast.show("Failed to add dependants");
    } finally {
      setSaving(false);
    }
  };

  const addNewRow = () => {
    setNewRows(prev => [...prev, { id: nextRowId, fn: "", ln: "" }]);
    setNextRowId(prev => prev + 1);
  };

  const removeRow = (rowId: number) => {
    setNewRows(prev => prev.filter(r => r.id !== rowId));
  };

  const updateRow = (rowId: number, field: "fn" | "ln", value: string) => {
    setNewRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
  };

  const handleEdit = async () => {
    if (!editingItem || !firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      const token = await shopify.sessionToken.get();
      const customerId = shopify.authenticatedAccount?.customer?.current?.id;

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
        shopify.toast.show("Dependant updated successfully");
        setEditingItem(null);
        setFirstName("");
        setLastName("");
      }
    } catch (e) {
      console.error("Edit failed", e);
      shopify.toast.show("Failed to update dependant");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (item: Dependant) => {
    setEditingItem(item);
    setFirstName(item.first_name);
    setLastName(item.last_name);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFirstName("");
    setLastName("");
    setNewRows([{ id: 1, fn: "", ln: "" }]);
    setNextRowId(2);
  };

  const handleRemove = async () => {
    if (!removingItem) return;
    const { id } = removingItem;
    setSaving(true);
    try {
      const token = await shopify.sessionToken.get();
      const customerId = shopify.authenticatedAccount?.customer?.current?.id;

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
        shopify.toast.show("Dependant removed");
        confirmModalRef.current?.hideOverlay();
        setRemovingItem(null);
      }
    } catch (e) {
      console.error("Remove failed", e);
      shopify.toast.show("Failed to remove dependant");
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
              onInput={(e: any) => {
                setSearch(e.currentTarget.value);
                setCurrentPage(1);
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
            <s-grid gridTemplateColumns="1fr 1fr 120px 120px" gap="base" padding="base" background="subdued" borderWidth="base none none none" borderRadius="base base none none">
              <s-text type="strong">First Name</s-text>
              <s-text type="strong">Last Name</s-text>
              <s-text type="strong">Action</s-text>
              <s-text type="strong"></s-text>
            </s-grid>
            
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

            {paginationEnabled && totalPages > 1 && (
              <s-box padding="base" borderWidth="base none none none">
                <s-grid gridTemplateColumns="1fr auto 1fr" gap="base" alignItems="center">
                  <s-button
                    disabled={currentPage === 1 || pageLoading}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    {prevLabel}
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
                        {nextLabel}
                      </s-button>
                    </s-grid>
                  </s-box>
                </s-grid>
              </s-box>
            )}
          </s-stack>
        )}

        <s-modal id="add-dependant-modal" ref={modalRef} heading={editingItem ? "Edit Dependant" : "Add New Dependant"}>
          <s-stack gap="base" padding="base">
            {editingItem ? (
              <>
                <s-text-field
                  label="First Name"
                  value={firstName}
                  onInput={(e: any) => setFirstName(e.currentTarget.value)}
                  required
                />
                <s-text-field
                  label="Last Name"
                  value={lastName}
                  onInput={(e: any) => setLastName(e.currentTarget.value)}
                  required
                />
              </>
            ) : (
              <>
                {newRows.map((row, idx) => (
                  <s-grid key={row.id} gridTemplateColumns={newRows.length > 1 ? "1fr 1fr auto" : "1fr 1fr"} gap="base" alignItems="end">
                    <s-text-field
                      label={idx === 0 ? "First Name" : ""}
                      placeholder="First Name"
                      value={row.fn}
                      onInput={(e: any) => updateRow(row.id, "fn", e.currentTarget.value)}
                      required
                    />
                    <s-text-field
                      label={idx === 0 ? "Last Name" : ""}
                      placeholder="Last Name"
                      value={row.ln}
                      onInput={(e: any) => updateRow(row.id, "ln", e.currentTarget.value)}
                      required
                    />
                    {newRows.length > 1 && (
                      <s-button
                        tone="critical"
                        variant="tertiary"
                        onClick={() => removeRow(row.id)}
                      >
                        ✕
                      </s-button>
                    )}
                  </s-grid>
                ))}
                <s-button
                  variant="tertiary"
                  onClick={addNewRow}
                >
                  + Add Another Dependant
                </s-button>
              </>
            )}
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
            <s-button
              slot="primary-action"
              variant="primary"
              onClick={handleBulkAdd}
              loading={saving}
              disabled={saving || newRows.every(r => !r.fn.trim() || !r.ln.trim())}
            >
              Save & Close
            </s-button>
          )}
          <s-button slot="secondary-actions" command="--hide" commandFor="add-dependant-modal">
            Cancel
          </s-button>
        </s-modal>

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
