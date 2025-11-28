-- Seed default CPT codes and assessment categories
-- Safe to run multiple times (idempotent)

-- Seed CPT codes
INSERT INTO medical_codes (code, description, code_type, category, duration, is_active) VALUES
('90791', 'Psychiatric diagnostic evaluation', 'cpt', 'assessment', 60, true),
('90832', 'Individual psychotherapy, 30 minutes', 'cpt', 'individual', 30, true),
('90834', 'Individual psychotherapy, 45 minutes', 'cpt', 'individual', 45, true),
('90837', 'Individual psychotherapy, 60 minutes', 'cpt', 'individual', 60, true),
('90846', 'Family psychotherapy without patient present', 'cpt', 'family', 50, true),
('90847', 'Family psychotherapy with patient present', 'cpt', 'family', 50, true),
('90849', 'Multiple-family group psychotherapy', 'cpt', 'group', 50, true),
('90853', 'Group psychotherapy', 'cpt', 'group', 50, true),
('90833', 'Psychotherapy add-on, 30 minutes', 'cpt', 'addon', 30, true),
('90836', 'Psychotherapy add-on, 45 minutes', 'cpt', 'addon', 45, true),
('90838', 'Psychotherapy add-on, 60 minutes', 'cpt', 'addon', 60, true),
('96130', 'Psychological testing evaluation services', 'cpt', 'assessment', 60, true),
('96131', 'Psychological testing evaluation services, each additional hour', 'cpt', 'assessment', 60, true),
('96132', 'Neuropsychological testing evaluation services', 'cpt', 'assessment', 60, true),
('96133', 'Neuropsychological testing evaluation services, each additional hour', 'cpt', 'assessment', 60, true)
ON CONFLICT (code) DO NOTHING;

-- Seed ICD-10 diagnosis codes (common mental health diagnoses)
INSERT INTO medical_codes (code, description, code_type, is_active) VALUES
('F41.1', 'Generalized anxiety disorder', 'icd10', true),
('F41.0', 'Panic disorder', 'icd10', true),
('F32.0', 'Major depressive disorder, single episode, mild', 'icd10', true),
('F32.1', 'Major depressive disorder, single episode, moderate', 'icd10', true),
('F32.2', 'Major depressive disorder, single episode, severe', 'icd10', true),
('F33.0', 'Major depressive disorder, recurrent, mild', 'icd10', true),
('F33.1', 'Major depressive disorder, recurrent, moderate', 'icd10', true),
('F33.2', 'Major depressive disorder, recurrent, severe', 'icd10', true),
('F43.10', 'Post-traumatic stress disorder, unspecified', 'icd10', true),
('F43.12', 'Post-traumatic stress disorder, chronic', 'icd10', true),
('F60.3', 'Borderline personality disorder', 'icd10', true),
('F90.0', 'Attention-deficit hyperactivity disorder, predominantly inattentive type', 'icd10', true),
('F90.1', 'Attention-deficit hyperactivity disorder, predominantly hyperactive type', 'icd10', true),
('F90.2', 'Attention-deficit hyperactivity disorder, combined type', 'icd10', true),
('F84.0', 'Autistic disorder', 'icd10', true),
('F50.00', 'Anorexia nervosa, unspecified', 'icd10', true),
('F50.2', 'Bulimia nervosa', 'icd10', true),
('F50.8', 'Binge eating disorder', 'icd10', true),
('F10.20', 'Alcohol use disorder, moderate', 'icd10', true),
('F10.21', 'Alcohol use disorder, severe', 'icd10', true),
('F43.21', 'Adjustment disorder with depressed mood', 'icd10', true),
('F43.22', 'Adjustment disorder with anxiety', 'icd10', true),
('F43.23', 'Adjustment disorder with mixed anxiety and depressed mood', 'icd10', true),
('F40.10', 'Social anxiety disorder (social phobia)', 'icd10', true),
('F42.2', 'Obsessive-compulsive disorder, mixed obsessional thoughts and acts', 'icd10', true),
('F31.81', 'Bipolar II disorder', 'icd10', true),
('F31.9', 'Bipolar disorder, unspecified', 'icd10', true),
('Z63.0', 'Relationship distress with spouse or intimate partner', 'icd10', true),
('Z63.5', 'Disruption of family by separation or divorce', 'icd10', true),
('Z69.010', 'Encounter for mental health services for victim of parental child abuse', 'icd10', true)
ON CONFLICT (code) DO NOTHING;

-- Seed assessment categories
INSERT INTO assessment_categories (name, is_active, sort_order) VALUES
('Mental Health Assessment', true, 1),
('Substance Use Assessment', true, 2),
('Risk Assessment', true, 3),
('Psychosocial Assessment', true, 4),
('Cognitive Assessment', true, 5),
('Behavioral Assessment', true, 6),
('Trauma Assessment', true, 7),
('Developmental Assessment', true, 8),
('Suicide Risk Assessment', true, 9),
('Violence Risk Assessment', true, 10),
('Neuropsychological Assessment', true, 11),
('Personality Assessment', true, 12)
ON CONFLICT (name) DO NOTHING;

