"""Merkle tree over a batch of report hashes.

Publishing a single root hash lets an auditor prove a specific report was part of
a sealed batch without publishing the whole batch -- and lets a reader confirm
the batch has not changed since publication by comparing one 64-character string.
"""

from __future__ import annotations

from typing import Literal

from sentinel.ledger.hashing import sha256_hex

Side = Literal["L", "R"]
ProofStep = tuple[str, Side]


def _pair_hash(left: str, right: str) -> str:
    """Hash two child nodes into their parent."""
    return sha256_hex(bytes.fromhex(left) + bytes.fromhex(right))


def merkle_root(leaves: list[str]) -> str:
    """Root hash over ``leaves``.

    Odd levels duplicate the final node, the conventional approach. Note the
    known consequence: a batch of leaves [a, b] and [a, b, b] produce the same
    root. That ambiguity is harmless here because batch membership is fixed by
    the ledger's own sequence numbers, which are signed -- a verifier checks
    inclusion against a known batch, not an arbitrary leaf list.
    """
    if not leaves:
        raise ValueError("Cannot compute a Merkle root over zero leaves")

    level = list(leaves)
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        level = [_pair_hash(level[i], level[i + 1]) for i in range(0, len(level), 2)]
    return level[0]


def inclusion_proof(leaves: list[str], index: int) -> list[ProofStep]:
    """Sibling path proving ``leaves[index]`` is under the root.

    Each step records the sibling hash and which side it sits on, so a verifier
    can recombine in the correct order without holding the tree.
    """
    if not leaves:
        raise ValueError("Cannot build a proof over zero leaves")
    if not 0 <= index < len(leaves):
        raise IndexError(f"Leaf index {index} out of range for {len(leaves)} leaves")

    proof: list[ProofStep] = []
    level = list(leaves)
    position = index

    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        if position % 2:
            proof.append((level[position - 1], "L"))
        else:
            proof.append((level[position + 1], "R"))
        level = [_pair_hash(level[i], level[i + 1]) for i in range(0, len(level), 2)]
        position //= 2

    return proof


def verify_inclusion(leaf: str, proof: list[ProofStep], root: str) -> bool:
    """Recompute the root from a leaf and its sibling path."""
    current = leaf
    for sibling, side in proof:
        current = (
            _pair_hash(sibling, current) if side == "L" else _pair_hash(current, sibling)
        )
    return current == root
