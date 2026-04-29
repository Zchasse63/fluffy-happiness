/*
 * Member profile header — avatar + name + engagement / strike pills,
 * tier · email · phone, action row, and a credits / wallet summary.
 */

import { Avatar } from "@/components/avatar";
import { MemberActions } from "@/components/member-actions";
import { ChangeBadge } from "@/components/primitives";
import { ToneBadge } from "@/components/status-pill";
import { ENGAGEMENT_TONE, type Member } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

export function ProfileHeader({ member }: { member: Member }) {
  const tone = ENGAGEMENT_TONE[member.engagement];

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
        <Avatar name={member.name} seed={member.seed} size={64} />
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 10, marginBottom: 6 }}>
            <span
              className="serif"
              style={{
                fontSize: 32,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {member.name}
            </span>
            <ToneBadge tone={tone}>{member.engagement}</ToneBadge>
            {member.strikes > 0 && (
              <span
                className="badge"
                style={{
                  background: "var(--neg-soft)",
                  color: "var(--neg)",
                }}
              >
                {member.strikes} strike{member.strikes > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            {member.tier} · {member.email} · {member.phone || "no phone"}
          </div>
          <MemberActions memberId={member.id} />
        </div>
        <div style={{ textAlign: "right", minWidth: 200 }}>
          <div className="metric-label">Credits · Wallet</div>
          <div
            className="row"
            style={{ gap: 18, marginTop: 6, justifyContent: "flex-end" }}
          >
            <div>
              <div
                className="serif"
                style={{ fontSize: 28, letterSpacing: "-0.02em" }}
              >
                {member.credits === 999 ? "∞" : member.credits}
              </div>
              <div className="metric-label" style={{ marginBottom: 0 }}>
                credits
              </div>
            </div>
            <div>
              <div
                className="serif"
                style={{ fontSize: 28, letterSpacing: "-0.02em" }}
              >
                {formatCurrency(member.walletCents)}
              </div>
              <div className="metric-label" style={{ marginBottom: 0 }}>
                wallet
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <ChangeBadge value="+$0" />
          </div>
        </div>
      </div>
    </div>
  );
}
