import { ReactNode } from "react";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;       // ISO, for <time> + JSON-LD
  dateLabel: string;  // human label
  readMins: number;
  Body: () => ReactNode;
}

// Small prose primitives so posts stay readable and on-brand without a CSS framework.
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="font-display font-bold text-2xl sm:text-[28px] mt-12 mb-4 leading-tight">{children}</h2>
);
const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="font-display font-semibold text-lg mt-8 mb-2">{children}</h3>
);
const P = ({ children }: { children: ReactNode }) => (
  <p className="text-muted leading-relaxed mb-4">{children}</p>
);
const CTA = () => (
  <div className="my-8 rounded-2xl bg-sol/[0.06] border border-sol/30 p-6 text-center">
    <div className="font-display font-semibold text-lg">Check your mint in seconds</div>
    <p className="text-muted text-sm mt-1.5">Paste a mint address, see the exact recoverable amount, and decide.</p>
    <a href="/#recover"
      className="inline-block mt-4 font-display font-semibold text-white bg-sol-gradient rounded-xl px-6 py-3">
      Scan a mint →
    </a>
  </div>
);
const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} className="text-sol underline decoration-sol/30 underline-offset-2 hover:decoration-sol">{children}</a>
);

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "recover-excess-sol-solana-token-mint-guide",
    title: "Recover Excess SOL from Your Solana Token Mint: A Complete Guide (2026)",
    description:
      "If you launched an SPL token on Solana, your mint account may be holding recoverable SOL above the rent-exempt minimum. Learn what excess SOL is, who can reclaim it, and how to recover it safely and non-custodially with UnbrickSOL.",
    date: "2026-07-03",
    dateLabel: "July 3, 2026",
    readMins: 7,
    Body: () => (
      <>
        <P>
          Here's something most Solana token creators never think to check: your mint account might be
          holding SOL that belongs to you.
        </P>
        <P>Not a lot, maybe. But it's there, sitting idle, and you can get it back.</P>
        <P>
          When you launch an SPL token, the mint account needs a minimum SOL balance to stay alive on-chain.
          That's the rent-exempt reserve, and it's a requirement for any account on Solana. The problem is that
          over time, or depending on how the mint was originally set up, some mint accounts end up holding more
          than that minimum. The surplus just sits there. There's no automatic mechanism to return it, no alert,
          no notification. Most creators never know it exists.
        </P>
        <P>That changed recently.</P>

        <H2>What Actually Happened (The Protocol Change)</H2>
        <P>
          A Solana improvement proposal called SIMD-0266 introduced a new instruction specifically for this
          situation. Without getting too deep into the weeds: before this, there was no clean way to withdraw
          excess lamports from a mint account while keeping it functional. You couldn't just drain it without
          closing the account, and closing the account kills the token. So the SOL stayed stuck.
        </P>
        <P>
          The new instruction changes that. It targets only the surplus above the rent-exempt threshold and
          transfers it out while leaving the account and everything attached to it completely untouched. Your
          token supply stays the same. Your metadata stays the same. Your mint keeps working exactly as it did
          before. The only thing that changes is your wallet balance going up.
        </P>
        <P>
          This is live on mainnet now, which means if you created a token at any point and your mint qualifies,
          you can act on this today.
        </P>

        <H2>Why Would a Mint Have Excess SOL in the First Place?</H2>
        <P>Good question, because this part confuses a lot of people.</P>
        <P>
          When a mint is created, the person funding it often deposits slightly more SOL than the bare minimum,
          sometimes intentionally as a buffer, sometimes just because that's how the tooling calculated it at the
          time. Some mints were created during periods when rent calculations were different. Others accumulated
          excess through edge cases in how certain token programs handle deposits.
        </P>
        <P>
          In most cases, the creator never had visibility into the exact breakdown. You saw "mint created
          successfully" and moved on. The nuance of how many lamports were sitting inside the account versus how
          many were strictly required wasn't something most launch tools surfaced.
        </P>
        <P>
          The result is thousands of mint accounts across Solana holding lamports their creators could
          theoretically claim, but didn't know about and had no way to access.
        </P>

        <H2>Who Can Actually Recover the SOL</H2>
        <P>
          This is where it's important to be precise, because there's a misconception worth clearing up.
        </P>
        <P>
          Knowing a mint address doesn't give anyone access to the SOL inside it. The recovery instruction
          requires an authorised signature. Without that, nothing moves. The protocol is designed that way on
          purpose, and it's one of the things that makes this safe to talk about publicly.
        </P>
        <P>There are two situations where recovery is possible.</P>
        <P>
          The first is if you're still the active mint authority. If the wallet that controls the mint is yours
          and you still have access to it, the path is simple. You connect that wallet, the transaction is built,
          you sign it, done. Your authority over the mint is what authorises the withdrawal.
        </P>
        <P>
          The second is if the mint authority was renounced. This is actually the more common scenario for tokens
          that were launched with a "rug-proof" setup where the authority was burned or set to null. In that
          case, recovery is still possible using the original mint keypair, the actual key file that was
          generated when the mint was created. The mint essentially signs for itself. If you have that keypair
          and know where it is, you're in a good position. If you lost it, that SOL is gone.
        </P>

        <H2>The Part Nobody Tells You About Renounced Mints</H2>
        <P>
          A lot of token creators renounce mint authority as a trust signal to their community. It's a legitimate
          move and it makes sense from a tokenomics standpoint. But it also means most of those creators assumed
          that was the end of the story: no more control over the mint, full stop.
        </P>
        <P>
          What they didn't know is that if they held onto the original mint keypair, they'd still have a path to
          recover any excess lamports. The authority over the token supply is gone, yes. But the keypair can
          still be used for this specific instruction.
        </P>
        <P>
          If you launched a token, renounced authority, and still have the mint keypair somewhere in your files,
          it's worth checking whether your mint has a recoverable balance.
        </P>

        <H2>How to Check If Your Mint Has Recoverable SOL</H2>
        <P>
          The manual process involves querying Solana RPC for your mint account's lamport balance, fetching the
          rent-exempt minimum for that account size, subtracting one from the other, and then building the
          withdrawal transaction from scratch if there's a surplus. It's doable if you're comfortable with the
          Solana CLI or writing TypeScript against web3.js, but it's not a five-minute task.
        </P>
        <P>
          For most people, the easier path is to just paste the mint address into a tool that handles all of that
          automatically and shows you the number upfront before you commit to anything.
        </P>

        <CTA />

        <H2>What UnbrickSOL Does</H2>
        <P>
          UnbrickSOL was built specifically for this. It's non-custodial, which means your keys stay with you at
          every step.
        </P>
        <P>
          When you paste a mint address, it reads the account on-chain, calculates the exact recoverable amount,
          determines whether the mint uses the classic Token Program or Token-2022, identifies which recovery
          path applies to you (active authority or keypair), and shows you your net amount after the platform fee
          before you do anything. There's no guessing, no committing blind.
        </P>
        <P>
          If you're the active mint authority, you connect your wallet and sign the transaction. If the authority
          was renounced and you have the keypair, you load it locally in the browser. It never leaves your
          device. The keypair is used to construct the signature locally and that's it.
        </P>
        <P>
          The recovery happens in a single on-chain transaction. You can verify every detail of it on Solscan or
          any Solana explorer after it confirms. The platform takes a fee from the recovered amount, and the rest
          goes straight to your wallet.
        </P>
        <P>
          UnbrickSOL also has a wallet scan feature that auto-detects all the mints your connected wallet has
          authority over, shows you the total recoverable across all of them, and lets you sweep multiple mints
          in one go. If you launched more than one token, that's worth running.
        </P>

        <H2>Frequently Asked Questions</H2>
        <H3>Will this affect my token in any way?</H3>
        <P>
          No. The instruction only touches lamports above the rent-exempt minimum. The mint account stays open,
          the token supply is unchanged, metadata is unaffected, and any authorities you haven't renounced remain
          in place. From the perspective of your token holders, nothing happened.
        </P>
        <H3>Is this available on mainnet right now?</H3>
        <P>
          Yes. The feature gate for the recovery instruction has been activated on Solana mainnet. The tool works
          with real SOL on real mints today.
        </P>
        <H3>What if I sold my project or transferred it?</H3>
        <P>
          Recovery requires you to control either the current mint authority wallet or the original mint keypair.
          If you transferred both of those when you sold, then whoever holds them now would need to initiate the
          recovery. If you still have either one, you're still eligible.
        </P>
        <H3>How much SOL can I expect to recover?</H3>
        <P>
          It varies significantly depending on the mint. Some accounts have only a few thousand lamports above
          the minimum, which amounts to fractions of a cent. Others have considerably more. There's no way to
          know without scanning the specific mint, which is why the tool shows you the exact figure before asking
          you to do anything.
        </P>
        <H3>Is it safe to upload a mint keypair to a website?</H3>
        <P>
          UnbrickSOL reads the keypair file locally in your browser. It's never transmitted to any server. The
          same way a password manager can work with your data without sending it anywhere, the tool uses the
          keypair to construct a signature in-browser and then discards it. That said, if you're ever unsure
          about a tool handling keypair files, the right instinct is to verify the process before proceeding.
          Non-custodial means you can confirm exactly what's happening.
        </P>

        <H2>Worth Checking</H2>
        <P>
          If you've launched a token on Solana, even a small one, even one that didn't go anywhere, it takes
          about thirty seconds to paste the mint address and find out if there's anything recoverable. Most
          people find out there's nothing significant, which is fine. But some find a few SOL sitting there that
          they had completely written off.
        </P>
        <P>
          UnbrickSOL handles the technical side so you don't have to. Paste the address, see the number, decide
          if you want to recover it.
        </P>
        <P>That's the whole process.</P>

        <CTA />
      </>
    ),
  },

  {
    slug: "what-is-rent-exempt-reserve-solana",
    title: "What Is the Rent-Exempt Reserve on Solana? (And Why Mints Hold Excess SOL)",
    description:
      "Every Solana account must hold a minimum SOL balance called the rent-exempt reserve. Here's what it is, how it's calculated, and why token mint accounts often end up holding excess SOL above it.",
    date: "2026-07-03",
    dateLabel: "July 3, 2026",
    readMins: 5,
    Body: () => (
      <>
        <P>
          If you've looked into recovering SOL from a token mint, you've run into the phrase "rent-exempt
          reserve." It's the single concept that explains why excess SOL exists in the first place. Here's the
          plain-English version.
        </P>
        <H2>Solana accounts pay rent — unless they're exempt</H2>
        <P>
          Every account on Solana takes up space in the validator's state, and storing that state has a cost.
          To account for it, Solana requires each account to hold a minimum SOL balance proportional to its size.
          Hold that minimum and the account is "rent-exempt" — it never gets charged and never gets purged. Hold
          less and the account would eventually be removed. In practice, essentially every account is created
          rent-exempt from day one.
        </P>
        <H2>How the minimum is calculated</H2>
        <P>
          The rent-exempt minimum is a function of the account's data size in bytes. A classic SPL token mint is
          82 bytes, which works out to a small, fixed amount of SOL. A Token-2022 mint can be larger if it uses
          extensions, so its minimum is higher. The key point: the minimum depends only on the account's size,
          not on its history or balance.
        </P>
        <H2>So where does the excess come from?</H2>
        <P>
          A mint account's balance can end up above its rent-exempt minimum for a few reasons: the tool that
          created it deposited a buffer, the mint was made when rent parameters were different, or lamports
          accumulated through how a program handled deposits. Whatever the cause, the surplus above the minimum
          is what we call <A href="/blog/recover-excess-sol-solana-token-mint-guide">excess SOL</A> — and it
          used to be stuck, because the only way to get lamports out of an account was to close it, which
          destroys the mint.
        </P>
        <H2>What changed</H2>
        <P>
          A Solana upgrade (<A href="/blog/simd-0266-withdraw-excess-lamports">SIMD-0266</A>) added an instruction
          that withdraws only the surplus above the rent-exempt line, leaving the account funded and fully
          functional. That's exactly the balance UnbrickSOL measures when it scans your mint: current lamports
          minus the rent-exempt minimum for that account's size.
        </P>
        <CTA />
        <P>
          Related reading: <A href="/blog/is-excess-sol-recovery-safe">Is excess-SOL recovery safe?</A> and{" "}
          <A href="/blog/recover-sol-renounced-mint">recovering from a renounced mint</A>.
        </P>
      </>
    ),
  },

  {
    slug: "simd-0266-withdraw-excess-lamports",
    title: "SIMD-0266 Explained: Withdrawing Excess Lamports from Token Mints",
    description:
      "SIMD-0266 introduced withdraw_excess_lamports, the Solana instruction that lets authorised owners reclaim SOL sitting above the rent-exempt minimum in a mint account. Here's how it works.",
    date: "2026-07-03",
    dateLabel: "July 3, 2026",
    readMins: 5,
    Body: () => (
      <>
        <P>
          SIMD-0266 is the Solana Improvement Document behind excess-SOL recovery. If you want to understand what
          UnbrickSOL is actually doing under the hood, this is the mechanism.
        </P>
        <H2>The problem it solved</H2>
        <P>
          Before this change, there was no clean way to pull surplus lamports out of a mint account while keeping
          it alive. You could close the account to reclaim its balance, but closing a mint destroys the token.
          So any SOL above the{" "}
          <A href="/blog/what-is-rent-exempt-reserve-solana">rent-exempt reserve</A> was effectively frozen.
        </P>
        <H2>What the instruction does</H2>
        <P>
          SIMD-0266 added a <code>withdraw_excess_lamports</code> instruction. It transfers only the lamports
          above the rent-exempt minimum to a destination account and leaves everything else untouched: token
          supply, decimals, metadata, and any authorities you still hold. The mint keeps working exactly as
          before — the only change is the surplus moving to your wallet.
        </P>
        <H2>Who it lets sign</H2>
        <P>
          The withdrawal requires an authorised signature. That's either the active mint authority, or — for a{" "}
          <A href="/blog/recover-sol-renounced-mint">renounced mint</A> — the mint's own keypair signing for
          itself. There is no path for an unauthorised third party. Knowing a mint address gives no access.
        </P>
        <H2>Token Program and Token-2022</H2>
        <P>
          The capability applies across both the classic Token Program and{" "}
          <A href="/blog/token-2022-vs-token-program-excess-sol">Token-2022</A>. UnbrickSOL detects which program
          owns your mint and builds the correct instruction automatically.
        </P>
        <H2>It's live on mainnet</H2>
        <P>
          The feature gate for the instruction is activated on Solana mainnet, so recovery works with real SOL on
          real mints today. UnbrickSOL wraps the instruction (plus its fee) into a single transaction you sign in
          your own wallet and can verify on any explorer.
        </P>
        <CTA />
      </>
    ),
  },

  {
    slug: "recover-sol-renounced-mint",
    title: "How to Recover SOL from a Renounced Solana Mint (With the Mint Keypair)",
    description:
      "Renounced your mint authority as a trust signal? You can still recover excess SOL if you kept the original mint keypair. Here's how renounced-mint recovery works and why it's safe.",
    date: "2026-07-03",
    dateLabel: "July 3, 2026",
    readMins: 5,
    Body: () => (
      <>
        <P>
          Renouncing mint authority is a common, legitimate trust signal — it tells your community no more tokens
          can be minted. Most creators assume that's the end of any control over the mint. For excess SOL,
          there's a nuance worth knowing.
        </P>
        <H2>Renounced authority ≠ no recovery</H2>
        <P>
          When you renounce, the mint authority is set to null. You can no longer change the token supply. But if
          you kept the <strong>original mint keypair</strong> — the key file generated when the mint was created
          — that keypair can still sign the{" "}
          <A href="/blog/simd-0266-withdraw-excess-lamports">withdraw_excess_lamports</A> instruction. The mint
          essentially signs for itself.
        </P>
        <H2>What you need</H2>
        <P>
          You need the mint keypair file (often a <code>.json</code> array of bytes). If you have it, recovery is
          possible. If you lost it, the excess SOL cannot be withdrawn — there's no authorised signer, and that's
          by design.
        </P>
        <H2>How UnbrickSOL handles it safely</H2>
        <P>
          When a mint is renounced, UnbrickSOL asks you to load the keypair file. It's read locally in your
          browser to construct the signature and is never uploaded to any server. This is the same non-custodial
          principle behind the rest of the tool — see{" "}
          <A href="/blog/is-excess-sol-recovery-safe">is excess-SOL recovery safe?</A> for the full picture.
        </P>
        <H2>Steps</H2>
        <P>
          Paste the renounced mint's address to see the recoverable amount, load the original keypair when
          prompted, review the details, and sign. The excess lands in your wallet in a single transaction.
        </P>
        <CTA />
      </>
    ),
  },

  {
    slug: "token-2022-vs-token-program-excess-sol",
    title: "Token-2022 vs Token Program: Recovering Excess SOL from Each",
    description:
      "Solana has two token programs. Both can hold excess SOL, but they differ in account size and how recovery works. Here's what to know about excess-SOL recovery on the Token Program and Token-2022.",
    date: "2026-07-03",
    dateLabel: "July 3, 2026",
    readMins: 4,
    Body: () => (
      <>
        <P>
          Solana has two token standards: the classic Token Program and the newer Token-2022. If you're checking
          a mint for recoverable SOL, it helps to know which one you're dealing with — though UnbrickSOL detects
          it for you automatically.
        </P>
        <H2>The classic Token Program</H2>
        <P>
          The original SPL Token Program uses fixed-size mint accounts (82 bytes). Their{" "}
          <A href="/blog/what-is-rent-exempt-reserve-solana">rent-exempt minimum</A> is the same for every mint,
          which makes the recoverable-excess calculation straightforward. Recovery uses the SIMD-0266{" "}
          <A href="/blog/simd-0266-withdraw-excess-lamports">withdraw_excess_lamports</A> path.
        </P>
        <H2>Token-2022</H2>
        <P>
          Token-2022 supports extensions (transfer fees, metadata, and more), so its mint accounts can be larger
          and vary in size. That means a higher rent-exempt minimum, but the same principle applies: anything
          above that minimum is recoverable by an authorised signer. Token-2022 has supported withdrawing excess
          lamports natively.
        </P>
        <H2>How to tell — and why it doesn't matter much</H2>
        <P>
          You can tell them apart by the mint account's owner program, but you don't need to. When you scan a
          mint, UnbrickSOL reads the owning program, computes the correct rent-exempt minimum for that account's
          exact size, and builds the right recovery path — classic or Token-2022, active authority or{" "}
          <A href="/blog/recover-sol-renounced-mint">renounced keypair</A>.
        </P>
        <CTA />
      </>
    ),
  },

  {
    slug: "is-excess-sol-recovery-safe",
    title: "Is Excess-SOL Recovery Safe? Non-Custodial Recovery Explained",
    description:
      "Excess-SOL recovery is safe when it's non-custodial: your keys stay with you, nobody else can claim your mint's SOL, and every recovery is a single verifiable on-chain transaction. Here's why.",
    date: "2026-07-03",
    dateLabel: "July 3, 2026",
    readMins: 5,
    Body: () => (
      <>
        <P>
          Any time real funds are involved, "is this safe?" is the right first question. Here's an honest look at
          what makes excess-SOL recovery safe — and what to watch for.
        </P>
        <H2>Nobody else can take your mint's SOL</H2>
        <P>
          The recovery instruction requires an authorised signature: the mint authority wallet, or the original
          mint keypair. Knowing a mint address grants no access. This is enforced by the protocol, not by any
          website's goodwill — it's why the topic is safe to discuss openly.
        </P>
        <H2>What "non-custodial" actually means</H2>
        <P>
          Non-custodial means the tool never holds your funds or your keys. UnbrickSOL never asks for a seed
          phrase, never takes custody, and never uploads private keys. You approve a transaction in your own
          wallet; the SOL moves directly to you. When a{" "}
          <A href="/blog/recover-sol-renounced-mint">renounced mint</A> requires the mint keypair, it's read
          locally in your browser to build the signature and then discarded.
        </P>
        <H2>Everything is verifiable</H2>
        <P>
          Recovery happens as a single on-chain transaction. Before you sign, you see the exact recoverable
          amount and your net after fee; after you sign, you can inspect every instruction of the transaction on
          any Solana explorer. Nothing is hidden.
        </P>
        <H2>Healthy caution</H2>
        <P>
          If any tool ever asks for your seed phrase, that's a red flag — no legitimate recovery needs it. And if
          you're ever unsure about a tool handling a keypair file, verify the process first. Non-custodial means
          you can confirm exactly what's happening.
        </P>
        <CTA />
      </>
    ),
  },
];

export const getPost = (slug: string): BlogPost | undefined =>
  BLOG_POSTS.find((p) => p.slug === slug);
