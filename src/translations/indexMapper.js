import { arrayFilter, arrayMap, arrayReduce } from './../helpers/array';
import IndexesList from './indexesList';

const INDEXES_SEQUENCE_KEY = 'sequence';
const SKIPPED_INDEXES_KEY = 'skipped';

class IndexMapper {
  constructor() {
    this.indexesLists = new Map([
      [INDEXES_SEQUENCE_KEY, new IndexesList()],
      [SKIPPED_INDEXES_KEY, new IndexesList()],
    ]);
  }

  /**
   * Get physical index by its visual index.
   *
   * @param {Number} visualIndex Visual index.
   * @return {Number|null} Returns translated index mapped by passed visual index.
   */
  getPhysicalIndex(visualIndex) {
    const visibleIndexes = this.getNotSkippedIndexes();
    const numberOfVisibleIndexes = visibleIndexes.length;

    let physicalIndex = null;

    if (visualIndex < numberOfVisibleIndexes) {
      physicalIndex = visibleIndexes[visualIndex];
    }

    return physicalIndex;
  }

  /**
   * Get visual index by its physical index.
   *
   * @param {Number} physicalIndex Physical index to search.
   * @returns {Number|null} Returns a visual index of the index mapper.
   */
  getVisualIndex(physicalIndex) {
    const visibleIndexes = this.getNotSkippedIndexes();
    let visualIndex = null;

    if (!this.isSkipped(physicalIndex) && this.getIndexesSequence().includes(physicalIndex)) {
      visualIndex = visibleIndexes.indexOf(physicalIndex);
    }

    return visualIndex;
  }

  /**
   * Reset current index map and create new one.
   *
   * @param {Number} [length] Custom generated map length.
   */
  createIndexesSequence(length = this.getNumberOfIndexes()) {
    this.setIndexesSequence(new Array(length).fill(0).map((nextIndex, stepsFromStart) => nextIndex + stepsFromStart));
  }

  /**
   * Get all indexes sequence.
   *
   * @returns {Array}
   */
  getIndexesSequence() {
    return this.indexesLists.get(INDEXES_SEQUENCE_KEY).getIndexes();
  }

  /**
   * Set completely new indexes sequence.
   *
   * @param {Array} indexes Physical row indexes.
   */
  setIndexesSequence(indexes) {
    return this.indexesLists.get(INDEXES_SEQUENCE_KEY).setIndexes(indexes);
  }

  /**
   * Get all indexes skipped in the process of rendering.
   *
   * @returns {Array}
   */
  getSkippedIndexes() {
    return this.indexesLists.get(SKIPPED_INDEXES_KEY).getIndexes();
  }

  /**
   * Set completely new list of indexes skipped in the process of rendering.
   *
   * @param {Array} indexes Physical row indexes.
   */
  setSkippedIndexes(indexes) {
    return this.indexesLists.get(SKIPPED_INDEXES_KEY).setIndexes(indexes);
  }

  /**
   * Get whether index is skipped in the process of rendering.
   *
   * @param {Number} physicalIndex Physical index.
   * @returns {Boolean}
   */
  isSkipped(physicalIndex) {
    return this.getSkippedIndexes().includes(physicalIndex);
  }

  /**
   * Clear all skipped indexes.
   */
  clearSkippedIndexes() {
    this.setSkippedIndexes([]);
  }

  /**
   * Get all indexes NOT skipped in the process of rendering.
   *
   * @returns {Array}
   */
  getNotSkippedIndexes() {
    return arrayFilter(this.getIndexesSequence(), index => this.isSkipped(index) === false);
  }

  /**
   * Get length of all indexes NOT skipped in the process of rendering.
   *
   * @returns {Array}
   */
  getNotSkippedIndexesLength() {
    return this.getNotSkippedIndexes().length;
  }

  /**
   * Get number of all indexes.
   *
   * @returns {Number}
   */
  getNumberOfIndexes() {
    return this.getIndexesSequence().length;
  }

  /**
   * Move indexes in the index mapper.
   *
   * @param {Number|Array} movedIndexes Visual index(es) to move.
   * @param {Number} finalIndex Visual row index being a start index for the moved rows.
   */
  moveIndexes(movedIndexes, finalIndex) {
    if (typeof movedIndexes === 'number') {
      movedIndexes = [movedIndexes];
    }

    const physicalMovedIndexes = arrayMap(movedIndexes, row => this.getPhysicalIndex(row));

    this.setIndexesSequence(this.getFilteredIndexes(this.getIndexesSequence(), physicalMovedIndexes));

    // When item(s) are moved after the last item we assign new index.
    let indexNumber = this.getNumberOfIndexes();

    // Otherwise, we find proper index for inserted item(s).
    if (finalIndex < this.getNotSkippedIndexesLength()) {
      const physicalIndex = this.getPhysicalIndex(finalIndex);
      indexNumber = this.getIndexesSequence().indexOf(physicalIndex);
    }

    // We count number of skipped rows from the start to the position of inserted item(s).
    const skippedRowsToTargetIndex = arrayReduce(this.getIndexesSequence().slice(0, indexNumber), (skippedRowsSum, currentValue) => {
      if (this.isSkipped(currentValue)) {
        return skippedRowsSum + 1;
      }
      return skippedRowsSum;
    }, 0);

    this.setIndexesSequence(this.getListWithInsertedIndexes(this.getIndexesSequence(), finalIndex + skippedRowsToTargetIndex, physicalMovedIndexes));
  }

  /**
   * Update indexes after inserting new indexes.
   *
   * @private
   * @param {Number} firstInsertedVisualIndex First inserted visual index.
   * @param {Number} firstInsertedPhysicalIndex First inserted physical index.
   * @param {Number} amountOfIndexes Amount of inserted indexes.
   */
  updateIndexesAfterInsertion(firstInsertedVisualIndex, firstInsertedPhysicalIndex, amountOfIndexes) {
    const nthVisibleIndex = this.getNotSkippedIndexes()[firstInsertedVisualIndex];
    const insertionIndex = this.getIndexesSequence().includes(nthVisibleIndex) ? this.getIndexesSequence().indexOf(nthVisibleIndex) : this.getNumberOfIndexes();
    const insertedIndexes = new Array(amountOfIndexes).fill(firstInsertedPhysicalIndex).map((nextIndex, stepsFromStart) => nextIndex + stepsFromStart);

    this.indexesLists.get(INDEXES_SEQUENCE_KEY).addIndexesAndReorganize(insertionIndex, insertedIndexes);
    this.indexesLists.get(SKIPPED_INDEXES_KEY).increaseIndexes(insertionIndex, insertedIndexes);
  }

  /**
   * Update indexes after removing some indexes.
   *
   * @private
   * @param {Array} removedIndexes List of removed indexes.
   */
  updateIndexesAfterRemoval(removedIndexes) {
    this.indexesLists.get(INDEXES_SEQUENCE_KEY).removeIndexesAndReorganize(removedIndexes);
    this.indexesLists.get(SKIPPED_INDEXES_KEY).removeIndexesAndReorganize(removedIndexes);
  }
}

export default IndexMapper;
