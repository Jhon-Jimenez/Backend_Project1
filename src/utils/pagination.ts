export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginationResult<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export const paginate = async <T>(
    model: any,
    query: any,
    { page = 1, limit = 10 }: PaginationParams
    ): Promise<PaginationResult<T>> => {
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
        model.countDocuments(query),
        model.find(query).skip(skip).limit(limit),
    ]);

    const pages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
        total,
        page,
        limit,
        pages,
        },
    };
};
