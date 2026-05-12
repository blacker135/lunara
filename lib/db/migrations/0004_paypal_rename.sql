-- lib/db/migrations/0004_paypal_rename.sql
-- 将 LemonSqueezy 相关字段重命名为 PayPal 字段，删除 LS 专用字段

ALTER TABLE subscriptions RENAME COLUMN lemon_squeezy_subscription_id TO paypal_subscription_id;
ALTER TABLE subscriptions RENAME COLUMN lemon_squeezy_variant_id TO paypal_plan_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemon_squeezy_customer_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemon_squeezy_order_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS cancel_at_period_end;

-- 重命名唯一约束（如果存在）
ALTER INDEX IF EXISTS subscriptions_lemon_squeezy_subscription_id_unique RENAME TO subscriptions_paypal_subscription_id_unique;
