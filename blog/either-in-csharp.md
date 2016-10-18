# Either in C# #

Have you ever heard about [tagged unions](http://en.wikipedia.org/wiki/Tagged_union)?
They are also known as variant records or discriminated unions.
You are most likely to find them in functional languages.
But what about primarily object-oriented languages?
I recently had the need to use this construct in C#, but I wasn't satisfied with the most common solution, so I came up with my own.

## The common approach

The most common solution to tagged unions of two types goes something like this:
```csharp
class TaggedUnion<T1, T2>
{
    private readonly bool isT1; // this is the tag; it could be implemented with an enum for more clarity
    private readonly object val;
 
    public T1 Val1
    {
        get
        {
            if (!isT1) throw new InvalidOperationException();
            return (T1)val;
        }
    }
 
    public T2 Val2
    {
        get
        {
            if (isT1) throw new InvalidOperationException();
            return (T2)val;
        }
    }
 
    public bool IsT1
    {
        get { return isT1; }
    }
 
    public TaggedUnion(T1 val)
    {
        this.val = val;
        isT1 = true;
    }
 
    public TaggedUnion(T2 val)
    {
        this.val = val;
        isT1 = false;
    }
}
```

Use it like this:
```csharp
var foo = new TaggedUnion<int, string>(42);
// ...
if (foo.IsT1)
    doWithInt(foo.Val1);
else
    doWithString(foo.Val2);
```

But this is too error-prone to my liking.
It's all too easy to accidentally use the wrong getter in the wrong place.

## Borrowing from Haskell

Haskell has a built-in type<sup id="anchor1">[1](#footnote1)</sup> called `Either`, which can be used as a tagged union of two types. Its definition is:
```haskell
data Either a b = Left a
                | Right b
```

In C# parlance, I would describe this as a `class` named `Either`, having two generic parameters `a` and `b`.
This class has two (named) constructors<sup id="anchor2">[2](#footnote2)</sup>: `Left` and `Right`.
`Left` takes a parameter of type `a`, `Right` takes a parameter of type `b`.
In code:
```csharp
class Either<a, b>
{
    public static Either<a, b> Left(a val) { /* ... */ }
    public static Either<a, b> Right(b val) { /* ... */ }
}
```

This has a remarkable resemblance to the common implementation.
The true difference is in the method of access to the internal values.
Haskell uses a mix of its [case expression and pattern matching](http://www.haskell.org/tutorial/patterns.html):
```haskell
-- foo :: Either Int String
case foo of
    Left val -> doWithInt(val)
    Right val -> doWithString(val)
```

The first line is a comment, which states `foo`'s type.
The second line is the head of a *case expression* which says that we'd like to pattern match on the value of `foo`.
The 3rd line is an alternative of the case expression and it says that if `foo` has been created with the `Left` constructor (it matches the pattern to the left of the arrow), then name its internal value `val` and do what's on the right side of the arrow.
The 4th line states the same for the `Right` constructor.

When I thought about this solution and how clean it is, I knew I'd struck gold! I just had to implement it somehow in C#.

## Implementation

I think there's almost no need for an explanation, so without further ado, here are the interesting parts of the implementation:
```csharp
public interface IEither<out Tl, out Tr>
{
    U Case<U>(Func<Tl, U> ofLeft, Func<Tr, U> ofRight);
    void Case(Action<Tl> ofLeft, Action<Tr> ofRight);
}
 
public static class Either
{
    private sealed class LeftImpl<Tl, Tr> : IEither<Tl, Tr>
    {
        private readonly Tl value;
 
        public LeftImpl(Tl value)
        {
            this.value = value;
        }
 
        public U Case<U>(Func<Tl, U> ofLeft, Func<Tr, U> ofRight)
        {
            if (ofLeft == null)
                throw new ArgumentNullException("ofLeft");
 
            return ofLeft(value);
        }
 
        public void Case(Action<Tl> ofLeft, Action<Tr> ofRight)
        {
            if (ofLeft == null)
                throw new ArgumentNullException("ofLeft");
 
            ofLeft(value);
        }
    }
 
    public static IEither<Tl, Tr> Left<Tl, Tr>(Tl value)
    {
        return new LeftImpl<Tl, Tr>(value);
    }
}
```

The implementation for the `Right` case follows the same pattern as for `Left`.
You can find the full code with comments [here](https://gist.github.com/3923828).
Usage:
```csharp
var foo = Either.Left<int, string>(42);
// ...
foo.Case(val => doWithInt(val), val => doWithString(val)); // actually, there's no need for the lambdas,
                                                           // but I use it that way most of the time
```

## Addendum

The solution could be expanded to 3 or more types easily, but you could also use nesting, e.g.: `IEither<int, IEither<string, bool>> bar;`

In languages without support for higher-order functions, something similar could be achieved by using the Visitor pattern.
Boost uses this for C++ with [`boost::variant`](http://www.boost.org/doc/libs/1_51_0/doc/html/variant.html).

Another similar type in Haskell is `Maybe`, which's "common approach" implementation in C# is the `Nullable` type, but which could be implemented using the pattern I used here for `Either`.
Could you think of a use-case where this implementation would be better than `Nullable`?
Why?

**Thanks for stopping by!**

---
<sup id="footnote1">[1](#anchor1)</sup> It's a type constructor, actually.

<sup id="footnote2">[2](#anchor2)</sup> In Haskell, you have to name constructors. In C#, you can achieve the same effect with static “creator” methods.