export enum ServerEventType {
  CategoryUpserted = 'category.upserted',
  CategoryDeleted = 'category.deleted',
  ItemUpserted = 'item.upserted',
  ItemDeleted = 'item.deleted',
  OrderCreated = 'order.created',
  OrderUpdated = 'order.updated',
  Resync = 'resync' // client must fetch snapshots again
}
