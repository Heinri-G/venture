-- =============================================
-- Adventure places: allow owners to update order_index
-- =============================================

-- Owners can reorder the places linked to their adventures
CREATE POLICY "Users can update places in own adventures" ON public.adventure_places
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.adventures a
      WHERE a.id = adventure_id AND a.owner_id = auth.uid()
    )
  );

GRANT UPDATE ON public.adventure_places TO authenticated;
