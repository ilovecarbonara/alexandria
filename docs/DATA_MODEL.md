# Data Model

## Supabase Tables

### users
| column          | type      | notes                          |
|-----------------|-----------|--------------------------------|
| id              | uuid (PK) | Supabase auth user id          |
| email           | text      | Must be @uspf.edu.ph           |
| full_name       | text      |                                |
| is_approved     | boolean   | Admin approves before access   |
| is_admin        | boolean   | Only one seeded admin          |
| created_at      | timestamp |                                |

### theses
| column          | type      | notes                                      |
|-----------------|-----------|--------------------------------------------|
| id              | uuid (PK) |                                            |
| user_id         | uuid (FK) | references users.id                        |
| title           | text      |                                            |
| author_name     | text      |                                            |
| thesis_level    | enum      | undergraduate, masteral, doctoral          |
| thesis_category | text      | user-selected from predefined list         |
| submission_type | enum      | draft, final                               |
| sha256_hash     | text      | unique per entry                           |
| tx_hash         | text      | blockchain transaction hash                |
| block_timestamp | timestamp | timestamp from blockchain                  |
| registered_at   | timestamp | system registration time                   |

### disputes
| column          | type      | notes                                      |
|-----------------|-----------|--------------------------------------------|
| id              | uuid (PK) |                                            |
| thesis_id       | uuid (FK) | references theses.id                       |
| flagged_by      | uuid (FK) | references users.id                        |
| reason          | text      |                                            |
| status          | enum      | open, resolved                             |
| created_at      | timestamp |                                            |

## Smart Contract (Solidity)

### Struct: ThesisRecord
- sha256Hash: string
- submissionType: string  
- thesisLevel: string
- thesisCategory: string
- timestamp: uint256
- registeredBy: address

### Functions
- registerThesis(hash, submissionType, level, category) → emits ThesisRegistered event
- getThesis(hash) → returns ThesisRecord
- isRegistered(hash) → returns bool

### Events
- ThesisRegistered(hash, registeredBy, timestamp)