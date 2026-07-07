from sqlmodel import SQLModel, Field
from typing import Optional


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str


class UserCreate(SQLModel):
    email: str
    password: str


class UserPublic(SQLModel):
    id: int
    email: str