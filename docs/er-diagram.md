# Entity Relationship Diagram

Rendered by GitHub (Mermaid). A shareable link version is on dbdiagram.io using `docs/schema.dbml`.

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "signs in with"
    USERS ||--o{ RESERVATIONS : "makes"
    USERS |o--o{ RESERVATIONS : "cancels (cancelled_by)"
    CATEGORIES ||--o{ RESOURCES : "groups"
    RESOURCES ||--o{ RESERVATIONS : "is booked through"

    USERS {
        uuid id PK
        text name
        text email "unique, case-insensitive"
        text password_hash "scrypt"
        text role "admin | member"
        timestamptz created_at
    }
    SESSIONS {
        uuid id PK
        text token_hash UK "SHA-256 of cookie token"
        uuid user_id FK
        timestamptz expires_at
        timestamptz created_at
    }
    CATEGORIES {
        uuid id PK
        text name UK
        text description
    }
    RESOURCES {
        uuid id PK
        uuid category_id FK
        text name UK
        text description
        text location
        int capacity "optional, > 0"
        boolean is_active "false = retired"
        timestamptz created_at
        timestamptz updated_at
    }
    RESERVATIONS {
        uuid id PK
        uuid resource_id FK
        uuid user_id FK
        text title
        text notes
        timestamptz start_time
        timestamptz end_time "CHECK end > start"
        text status "confirmed | cancelled"
        timestamptz cancelled_at
        uuid cancelled_by FK
        timestamptz created_at
    }
```

## The rule that matters most

```sql
CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status = 'confirmed')
```

No two *confirmed* reservations for the same resource may overlap in time. The database enforces this
atomically, so even simultaneous requests cannot double-book. Cancelled reservations are ignored by the
constraint, which frees the slot.
