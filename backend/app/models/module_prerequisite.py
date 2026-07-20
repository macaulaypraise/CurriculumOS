from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ModulePrerequisite(Base):
    __tablename__ = "module_prerequisites"
    __table_args__ = (UniqueConstraint("module_id", "requires_module_id", name="uq_module_prerequisite_edge"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    requires_module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
