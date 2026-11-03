import { Global, Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import type { Book } from '../../books/book.entity';
import type { Review } from '../../reviews/review.entity';

export const PUB_SUB = Symbol('PUB_SUB');

/** Eventos de la app y su payload. La clave del payload = nombre de la subscription. */
export type LibraryEvents = {
  reviewAdded: { reviewAdded: Review };
  bookAvailabilityChanged: { bookAvailabilityChanged: Book };
};

export type LibraryPubSub = PubSub<LibraryEvents>;

/**
 * PubSub en memoria: suficiente para una sola instancia.
 * Con varias réplicas haría falta Redis u otro broker (ver "Pendientes").
 */
@Global()
@Module({
  providers: [{ provide: PUB_SUB, useValue: new PubSub<LibraryEvents>() }],
  exports: [PUB_SUB],
})
export class PubSubModule {}
