const response = {
    success(res, data, status = 200) {
        return res.status(status).json({
            success: true,
            data,
        });
    },
    error(res, message = 'Internal Server Error', status = 500) {
        return res.status(status).json({
            success: false,
            error: message,
        });
    },
    notFound(res, message = 'Resource not found') {
        return res.status(404).json({
            success: false,
            error: message,
        });
    }
};

export default response;
