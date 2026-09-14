-- ==========================================
-- Migración 002: Grupos, Empresas y Cronogramas
-- ==========================================

CREATE TABLE IF NOT EXISTS participant_groups (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT 'indigo',
    department VARCHAR(100),
    company_id VARCHAR(100) DEFAULT 'emp_kasino',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id VARCHAR(100) NOT NULL REFERENCES participant_groups(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, participant_card)
);

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    rnc_tax_id VARCHAR(50),
    industry VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO companies (id, name, slug, logo_url, rnc_tax_id, industry, contact_email, contact_phone, is_active)
VALUES 
    ('emp_kasino', 'Kasino 21 Corporativo', 'kasino-21', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=200&q=80', '101-928374-1', 'Entretenimiento & Hospitalidad', 'contacto@kasino21.com', '+1 (809) 555-0120', true),
    ('emp_resort', 'Gran Resort & Hospitality Club', 'gran-resort', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=200&q=80', '101-445566-2', 'Turismo & Hotelería', 'info@granresort.com', '+1 (809) 555-0340', true),
    ('emp_tech', 'Tech Innovations Labs', 'tech-innovations', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80', '101-778899-3', 'Tecnología & Software', 'rrhh@techlabs.io', '+1 (809) 555-0560', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS training_programs (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'completed')),
    company_id VARCHAR(100) DEFAULT 'emp_kasino',
    learning_framework VARCHAR(50) DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS program_events (
    program_id VARCHAR(100) NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    event_id VARCHAR(100) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    stage_category VARCHAR(50) DEFAULT 'formal_course_10',
    PRIMARY KEY (program_id, event_id)
);

CREATE TABLE IF NOT EXISTS program_target_groups (
    program_id VARCHAR(100) NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    group_id VARCHAR(100) NOT NULL REFERENCES participant_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (program_id, group_id)
);

CREATE TABLE IF NOT EXISTS program_target_participants (
    program_id VARCHAR(100) NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    participant_card VARCHAR(20) NOT NULL REFERENCES participants(card) ON DELETE CASCADE,
    PRIMARY KEY (program_id, participant_card)
);
