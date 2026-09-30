CREATE OR REPLACE FUNCTION public.adjust_stock_on_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status delivery_status;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    SELECT status INTO v_status FROM public.deliveries WHERE id = NEW.delivery_id;
    IF v_status NOT IN ('annulee', 'retournee') THEN
      UPDATE public.products
        SET remaining_quantity = remaining_quantity - NEW.quantity
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    SELECT status INTO v_status FROM public.deliveries WHERE id = NEW.delivery_id;
    IF v_status NOT IN ('annulee', 'retournee') THEN
      UPDATE public.products
        SET remaining_quantity = remaining_quantity + OLD.quantity - NEW.quantity
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    SELECT status INTO v_status FROM public.deliveries WHERE id = OLD.delivery_id;
    IF v_status NOT IN ('annulee', 'retournee') THEN
      UPDATE public.products
        SET remaining_quantity = remaining_quantity + OLD.quantity
        WHERE id = OLD.product_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_items_stock ON public.delivery_items;
CREATE TRIGGER trg_delivery_items_stock
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_items
FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_item_change();

CREATE OR REPLACE FUNCTION public.adjust_stock_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_out boolean;
  is_out boolean;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  was_out := OLD.status NOT IN ('annulee', 'retournee');
  is_out  := NEW.status NOT IN ('annulee', 'retournee');

  IF was_out AND NOT is_out THEN
    UPDATE public.products p
      SET remaining_quantity = remaining_quantity + di.quantity
      FROM public.delivery_items di
      WHERE di.delivery_id = NEW.id AND di.product_id = p.id;
  ELSIF NOT was_out AND is_out THEN
    UPDATE public.products p
      SET remaining_quantity = remaining_quantity - di.quantity
      FROM public.delivery_items di
      WHERE di.delivery_id = NEW.id AND di.product_id = p.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deliveries_status_stock ON public.deliveries;
CREATE TRIGGER trg_deliveries_status_stock
AFTER UPDATE OF status ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_status_change();

WITH consumed AS (
  SELECT di.product_id, SUM(di.quantity)::int AS qty
  FROM public.delivery_items di
  JOIN public.deliveries d ON d.id = di.delivery_id
  WHERE d.status NOT IN ('annulee', 'retournee')
  GROUP BY di.product_id
)
UPDATE public.products p
SET remaining_quantity = GREATEST(p.initial_quantity - COALESCE(c.qty, 0), 0)
FROM consumed c
WHERE p.id = c.product_id;