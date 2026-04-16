/** @jsx h */
import { h } from "preact";
import '@shopify/ui-extensions/preact';
import { COL2, COL3 } from "../../constants";

export function ProfileSkeleton() {
  return (
    <s-stack direction="block" gap="base">
        <s-box background="subdued" borderRadius="base" padding="large" border="base">
          <s-query-container>
            <s-grid gridTemplateColumns={COL2} gap="large" alignItems="center">
              {/* Left: title + name */}
              <s-grid-item>
                <s-stack direction="block" gap="small">
                  {/* "Welcome Back" */}
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="180px"
                    blockSize="26px"
                    border="base"
                  />
                  {/* "Gaurav Sharma" */}
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="120px"
                    blockSize="16px"
                    border="base"
                  />
                </s-stack>
              </s-grid-item>
              {/* Right: product image placeholder (contact lens box) */}
              <s-grid-item>
                <s-stack direction="inline" justifyContent="end">
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="120px"
                    blockSize="80px"
                    border="base"
                  />
                </s-stack>
              </s-grid-item>
            </s-grid>
          </s-query-container>
        </s-box>

        <s-query-container>
          <s-grid gridTemplateColumns={COL2} gap="base">
            {/* Left: Most Recent Order card */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-query-container>
                  <s-grid gridTemplateColumns={COL3} gap="base" alignItems="center">
                    {/* Cart icon */}
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="large-100"
                        inlineSize="24px"
                        blockSize="24px"
                        border="base"
                      />
                    </s-grid-item>
                    {/* Order label + number + items */}
                    <s-grid-item>
                      <s-stack direction="block" gap="small">
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="80%"
                          blockSize="13px"
                          border="base"
                        />
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="55%"
                          blockSize="16px"
                          border="base"
                        />
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="40%"
                          blockSize="12px"
                          border="base"
                        />
                      </s-stack>
                    </s-grid-item>
                    {/* REORDER button + Reorder Past Orders link */}
                    <s-grid-item>
                      <s-stack direction="block" gap="small">
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="88px"
                          blockSize="34px"
                          border="base"
                        />
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="120px"
                          blockSize="14px"
                          border="base"
                        />
                      </s-stack>
                    </s-grid-item>
                  </s-grid>
                </s-query-container>
              </s-box>
            </s-grid-item>

            {/* Right: Days Till Run Out card */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-grid gridTemplateColumns="auto 1fr" gap="base" alignItems="center">
                  {/* Calendar icon */}
                  <s-grid-item>
                    <s-box
                      background="subdued"
                      borderRadius="large-100"
                      inlineSize="24px"
                      blockSize="24px"
                      border="base"
                    />
                  </s-grid-item>
                  <s-grid-item>
                    <s-stack direction="block" gap="small">
                      {/* "Days Till Run Out" */}
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="75%"
                        blockSize="13px"
                        border="base"
                      />
                      {/* "257 days left of lenses" */}
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="90%"
                        blockSize="16px"
                        border="base"
                      />
                    </s-stack>
                  </s-grid-item>
                </s-grid>
              </s-box>
            </s-grid-item>
          </s-grid>
        </s-query-container>

        <s-query-container>
          <s-grid gridTemplateColumns={COL2} gap="base">
            {/* Left: Loyalty Points */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                  {/* Star icon */}
                  <s-grid-item>
                    <s-box
                      background="subdued"
                      borderRadius="large-100"
                      inlineSize="20px"
                      blockSize="20px"
                      border="base"
                    />
                  </s-grid-item>
                  {/* "My Loyalty Points" */}
                  <s-grid-item>
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="70%"
                      blockSize="14px"
                      border="base"
                    />
                  </s-grid-item>
                  {/* "39153 pts" right-aligned */}
                  <s-grid-item>
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="64px"
                      blockSize="14px"
                      border="base"
                    />
                  </s-grid-item>
                </s-grid>
              </s-box>
            </s-grid-item>

            {/* Right: Prescription Expiry */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                  {/* Calendar icon */}
                  <s-grid-item>
                    <s-box
                      background="subdued"
                      borderRadius="large-100"
                      inlineSize="20px"
                      blockSize="20px"
                      border="base"
                    />
                  </s-grid-item>
                  {/* "Prescription Expiry" + date */}
                  <s-grid-item>
                    <s-stack direction="block" gap="small">
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="80%"
                        blockSize="14px"
                        border="base"
                      />
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="65%"
                        blockSize="12px"
                        border="base"
                      />
                    </s-stack>
                  </s-grid-item>
                  {/* "All up to date — 334 days left" right-aligned */}
                  <s-grid-item>
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="100px"
                      blockSize="12px"
                      border="base"
                    />
                  </s-grid-item>
                </s-grid>
              </s-box>
            </s-grid-item>
          </s-grid>
        </s-query-container>

        <s-query-container>
          <s-grid gridTemplateColumns={COL2} gap="base">
            {/* ── Orders card ── */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-stack direction="block" gap="base">
                  {/* Header */}
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="50px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="large-100"
                        inlineSize="20px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                  </s-grid>
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="100%"
                    blockSize="1px"
                  />
                  {/* Links: Ongoing Order Status → 10 orders, Reorder, Past Orders, Invoices */}
                  <s-stack direction="block" gap="small">
                    <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="75%"
                          blockSize="14px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="60px"
                          blockSize="14px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="40%"
                      blockSize="14px"
                      border="base"
                    />
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="50%"
                      blockSize="14px"
                      border="base"
                    />
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="35%"
                      blockSize="14px"
                      border="base"
                    />
                  </s-stack>
                </s-stack>
              </s-box>
            </s-grid-item>

            {/* ── Prescription card ── */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="80px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="large-100"
                        inlineSize="20px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                  </s-grid>
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="100%"
                    blockSize="1px"
                  />
                  <s-stack direction="block" gap="small">
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="60%"
                      blockSize="14px"
                      border="base"
                    />
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="75%"
                      blockSize="14px"
                      border="base"
                    />
                  </s-stack>
                </s-stack>
              </s-box>
            </s-grid-item>

            {/* ── Delivery card ── */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="55px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="large-100"
                        inlineSize="20px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                  </s-grid>
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="100%"
                    blockSize="1px"
                  />
                  <s-stack direction="block" gap="small">
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="65%"
                      blockSize="14px"
                      border="base"
                    />
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="55%"
                      blockSize="14px"
                      border="base"
                    />
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="50%"
                      blockSize="14px"
                      border="base"
                    />
                  </s-stack>
                </s-stack>
              </s-box>
            </s-grid-item>

            {/* ── Medical Aid card  (label + value rows) ── */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="75px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                    {/* "+" icon */}
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="16px"
                        blockSize="16px"
                        border="base"
                      />
                    </s-grid-item>
                  </s-grid>
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="100%"
                    blockSize="1px"
                  />
                  {/* 4 label+value rows */}
                  <s-stack direction="block" gap="small">
                    <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="70%"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="70px"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                    <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="55%"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="36px"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                    <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="65%"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="70px"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                    <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="60%"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="56px"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                  </s-stack>
                </s-stack>
              </s-box>
            </s-grid-item>

            {/* ── Profile card ── */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="45px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="large-100"
                        inlineSize="20px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                  </s-grid>
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="100%"
                    blockSize="1px"
                  />
                  <s-stack direction="block" gap="small">
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="60%"
                      blockSize="14px"
                      border="base"
                    />
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="40%"
                      blockSize="14px"
                      border="base"
                    />
                  </s-stack>
                </s-stack>
              </s-box>
            </s-grid-item>

            {/* ── Rewards card  (label + value rows) ── */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="55px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="large-100"
                        inlineSize="20px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                  </s-grid>
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="100%"
                    blockSize="1px"
                  />
                  <s-stack direction="block" gap="small">
                    {/* "Use on your next order - [points]" */}
                    <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="80%"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="60px"
                          blockSize="13px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                    {/* "Earn & Redeem" */}
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="40%"
                      blockSize="13px"
                      border="base"
                    />
                  </s-stack>
                </s-stack>
              </s-box>
            </s-grid-item>

          
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-stack direction="block" gap="base">
                  {/* Header */}
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="55px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                    {/* Star icon */}
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="large-100"
                        inlineSize="20px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                  </s-grid>
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="100%"
                    blockSize="1px"
                  />
                  {/* Text links */}
                  <s-stack direction="block" gap="small">
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="70%"
                      blockSize="14px"
                      border="base"
                    />
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="75%"
                      blockSize="14px"
                      border="base"
                    />
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="55%"
                      blockSize="14px"
                      border="base"
                    />
                  </s-stack>
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="100%"
                    blockSize="1px"
                  />
                  {/* Product review rows: thumbnail + text + Review button */}
                  <s-stack direction="block" gap="base">
                    {/* Row 1 */}
                    <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="48px"
                          blockSize="48px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-stack direction="block" gap="small">
                          <s-box
                            background="subdued"
                            borderRadius="base"
                            inlineSize="85%"
                            blockSize="13px"
                            border="base"
                          />
                          <s-box
                            background="subdued"
                            borderRadius="base"
                            inlineSize="60%"
                            blockSize="12px"
                            border="base"
                          />
                        </s-stack>
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="56px"
                          blockSize="30px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                    {/* Row 2 */}
                    <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="48px"
                          blockSize="48px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-stack direction="block" gap="small">
                          <s-box
                            background="subdued"
                            borderRadius="base"
                            inlineSize="85%"
                            blockSize="13px"
                            border="base"
                          />
                          <s-box
                            background="subdued"
                            borderRadius="base"
                            inlineSize="55%"
                            blockSize="12px"
                            border="base"
                          />
                        </s-stack>
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="56px"
                          blockSize="30px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                    {/* Row 3 */}
                    <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="48px"
                          blockSize="48px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-stack direction="block" gap="small">
                          <s-box
                            background="subdued"
                            borderRadius="base"
                            inlineSize="85%"
                            blockSize="13px"
                            border="base"
                          />
                          <s-box
                            background="subdued"
                            borderRadius="base"
                            inlineSize="50%"
                            blockSize="12px"
                            border="base"
                          />
                        </s-stack>
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="56px"
                          blockSize="30px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                    {/* Row 4 */}
                    <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="48px"
                          blockSize="48px"
                          border="base"
                        />
                      </s-grid-item>
                      <s-grid-item>
                        <s-stack direction="block" gap="small">
                          <s-box
                            background="subdued"
                            borderRadius="base"
                            inlineSize="85%"
                            blockSize="13px"
                            border="base"
                          />
                          <s-box
                            background="subdued"
                            borderRadius="base"
                            inlineSize="45%"
                            blockSize="12px"
                            border="base"
                          />
                        </s-stack>
                      </s-grid-item>
                      <s-grid-item>
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          inlineSize="56px"
                          blockSize="30px"
                          border="base"
                        />
                      </s-grid-item>
                    </s-grid>
                  </s-stack>
                  {/* "View More" link skeleton */}
                  <s-stack direction="inline" justifyContent="center">
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="120px"
                      blockSize="14px"
                      border="base"
                    />
                  </s-stack>
                </s-stack>
              </s-box>
            </s-grid-item>

            {/* ── Support card ── */}
            <s-grid-item>
              <s-box background="base" borderRadius="base" padding="base" border="base">
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="base"
                        inlineSize="55px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                    {/* Email icon */}
                    <s-grid-item>
                      <s-box
                        background="subdued"
                        borderRadius="large-100"
                        inlineSize="20px"
                        blockSize="20px"
                        border="base"
                      />
                    </s-grid-item>
                  </s-grid>
                  <s-box
                    background="subdued"
                    borderRadius="base"
                    inlineSize="100%"
                    blockSize="1px"
                  />
                  <s-stack direction="block" gap="small">
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="30%"
                      blockSize="14px"
                      border="base"
                    />
                    <s-box
                      background="subdued"
                      borderRadius="base"
                      inlineSize="45%"
                      blockSize="14px"
                      border="base"
                    />
                  </s-stack>
                </s-stack>
              </s-box>
            </s-grid-item>
          </s-grid>
        </s-query-container>
      </s-stack>
  );
}
