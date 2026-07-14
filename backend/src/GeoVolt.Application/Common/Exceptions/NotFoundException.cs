using System;

namespace GeoVolt.Application.Common.Exceptions;

// İstenen kaynağın bulunamadığını belirtir.
public sealed class NotFoundException : Exception
{
    public NotFoundException(string message)
        : base(message)
    {
    }
}