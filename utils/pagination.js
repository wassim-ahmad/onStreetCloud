class Pagination {
  constructor(totalCount, currentPage, pageUri, perPage = 2, offset) {
    this.perPage = perPage;
    this.totalCount = parseInt(totalCount);
    this.currentPage = parseInt(currentPage);
    this.pageCount = Math.ceil(this.totalCount / this.perPage);
    this.pageUri = pageUri;
    this.offset = offset ?? (this.currentPage > 1 ? (this.currentPage - 1) * this.perPage : 0);
    this.sidePages = 4; // how many pages to show before and after current
  }

  links() {
    const pages = [];

    // Back links
    const startPage = Math.max(1, this.currentPage - this.sidePages);
    const endPage = Math.min(this.pageCount, this.currentPage + this.sidePages);

    for (let x = startPage; x <= endPage; x++) {
      pages.push(x);
    }

    return {
      pages,                    // array of page numbers
      currentPage: this.currentPage,
      previousPage: this.currentPage > 1 ? this.currentPage - 1 : null,
      nextPage: this.currentPage < this.pageCount ? this.currentPage + 1 : null,
      pageCount: this.pageCount
    };
  }
}

module.exports = Pagination;
