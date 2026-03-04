create table users(
id uuid primary key default gen_random_uuid(),
email varchar(255) unique not null,
password text not null,
role varchar(20) not null check (role in ('USER','ADMIN')),
is_active boolean not null default true,
created_at timestamp default now()
);

insert into users(email,password,role)
values(
'admin@gmail.com',
'$2b$10$K9v7nF4L3w8XzYpQmR5u6O7t8v9x1y2z3A4B5C6D7E8F9G0H1I2J',
'ADMIN'
);

select \* from users;

create table orders(
id uuid primary key default gen_random_uuid(),
user_id uuid not null references users(id) on delete cascade,
total_amount numeric(10,2) not null check (total_amount>=0),
status varchar(20) not null check
(status IN ('PENDING','PAID','FAILED','REFUNDED')),
created_at timestamp with time zone default now(),
updated_at timestamp with time zone default now()
);

INSERT INTO orders (user_id, total_amount, status)
VALUES (
(select id from users limit 1),
4999.00,
'PENDING'
);

select \* from orders;

create table payments(
id uuid primary key default gen_random_uuid(),
order_id uuid not null references orders(id) on delete cascade,
gateway_payment_id varchar(255) not null unique,
amount numeric(10,2) not null check (amount>=0),
status varchar(20) not null check (
status IN ('INITIATED','SUCCESS','FAILED','REFUNDED')
),
raw_response jsonb,
created_at timestamp with time zone default now(),
updated_at timestamp with time zone default now()
);
insert into payments(order_id,gateway_payment_id,amount,status)
values(
(select id from orders limit 1),
'djfl;sajf;jsafo23r9209023409sdjfsadljf',
4999.00,
'INITIATED'
);

drop table payments;

select \* from payments;

create table sessions(
id uuid primary key default gen_random_uuid(),
user_id uuid not null references users(id) on delete cascade,
refresh_token text not null,
expires_at timestamp with time zone not null,
user_agent text,
ip_address text,
device_name text,
is_revoked boolean default false,
created_at timestamp with time zone default now(),
revoked_at timestamp
)

create index idx_sessions_refresh_token
on sessions(refresh_token);
