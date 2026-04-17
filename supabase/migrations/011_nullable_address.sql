-- address, city, state, zip are not applicable for online-only and service-based businesses
ALTER TABLE businesses ALTER COLUMN address DROP NOT NULL;
ALTER TABLE businesses ALTER COLUMN city    DROP NOT NULL;
ALTER TABLE businesses ALTER COLUMN state   DROP NOT NULL;
ALTER TABLE businesses ALTER COLUMN zip     DROP NOT NULL;
