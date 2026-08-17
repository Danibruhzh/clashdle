from sqlalchemy import Boolean, Column, Integer, String

from app.db.base import Base


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)

    cost = Column(Integer, nullable=True)
    type = Column(String, nullable=True)
    rarity = Column(String, nullable=True)
    # Common < Rare < Epic < Legendary < Champion — lets rarity be compared
    # higher/lower like the numeric stats instead of just match/no-match.
    rarity_rank = Column(Integer, nullable=True)
    target = Column(String, nullable=True)

    # numeric value used for comparison logic
    hitpoints = Column(Integer, nullable=True)
    damage = Column(Integer, nullable=True)
    dps = Column(Integer, nullable=True)
    special_damage = Column(Integer, nullable=True)

    # full original text, preserved for display (e.g. "366 (122 x3)")
    hitpoints_raw = Column(String, nullable=True)
    damage_raw = Column(String, nullable=True)
    dps_raw = Column(String, nullable=True)
    special_damage_raw = Column(String, nullable=True)

    # the descriptive label for Special Damage (e.g. "Death Damage", "Spawn Damage")
    special_damage_label = Column(String, nullable=True)

    # preserves "(Stage 3)"-style qualifiers when Damage/DPS are stage-wrapped
    damage_stage_label = Column(String, nullable=True)
    dps_stage_label = Column(String, nullable=True)

    is_playable = Column(Boolean, nullable=False, default=True)

    def __repr__(self):
        return f"<Card id={self.id} name={self.name!r}>"
